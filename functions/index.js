const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {
  HttpsError
} = require("firebase-functions/v1/https");
const {
  Merchant
} = require("steplix-emv-qrcps");
const QRCode = require("qrcode");
const axios = require("axios").default;

admin.initializeApp();

exports.verificadorDeAcesso = functions.https.onCall((data, context) => {
  try {
    let accessList = ["master", "professores", "adm", "secretaria"];

    let hasAccess = accessList.some((access) => {
      console.log(context.auth.token[access]);
      if (context.auth.token[access] === true) {
        return true;
      }
      return false;
    });

    if (hasAccess) {
      return true;
    }

    throw new functions.https.HttpsError("permission-denied", "Acesso não liberado.");
  } catch (error) {
    console.log(error);
    throw new functions.https.HttpsError(
      "permission-denied",
      "Você não tem permissão para acesso. Você deve contatar um Administrador Master do sistema para liberação de acessos.",
      error
    );
  }
});

exports.liberaERemoveAcessos = functions.https.onCall(async (data, context) => {
  if (!context.auth.token.master) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Você não têm permissão para realizar esta ação."
    );
  }

  await admin
    .database()
    .ref(`sistemaEscolar/listaDeUsuarios/${data.uid}/acessos/${data.acesso}`)
    .set(data.checked);

  const snapshot = await admin
    .database()
    .ref(`sistemaEscolar/listaDeUsuarios/${data.uid}/acessos/`)
    .once("value");

  await admin.auth().revokeRefreshTokens(data.uid);
  await admin.auth().setCustomUserClaims(data.uid, snapshot.val());

  await admin.database().ref("sistemaEscolar/registroGeral").push({
    operacao: "Concessão e remoção de acessos aos usuários",
    timestamp: admin.firestore.Timestamp.now(),
    userCreator: context.auth.uid,
    dados: data
  });

  if (!data.checked) {
    if (data.acesso === "professores") {
      await admin.database().ref(`sistemaEscolar/listaDeProfessores/${data.uid}/`).remove();
      return {
        acesso: "Acesso removido"
      };
    }
    return {
      acesso: "Acesso removido!"
    };
  }

  if (data.acesso === "professores") {
    const user = await admin.auth().getUser(data.uid);
    await admin.database().ref(`sistemaEscolar/listaDeProfessores/${data.uid}/`).set({
      nome: user.displayName,
      email: user.email,
      timestamp: admin.firestore.Timestamp.now()
    });
    return {
      acesso: "Acesso concedido"
    };
  }
  return {
    acesso: "Acesso concedido!"
  };
});

exports.apagaContas = functions.https.onCall((data, context) => {
  if (context.auth.token.master === true) {
    return admin
      .auth()
      .deleteUser(data.uid)
      .then(() => {
        return admin
          .database()
          .ref("sistemaEscolar/registroGeral")
          .push({
            operacao: "Conta deletada",
            timestamp: admin.firestore.Timestamp.now(),
            userCreator: context.auth.uid,
            dados: data
          })
          .then(() => {
            return {
              answer: "Usuário deletado com sucesso."
            };
          })
          .catch((error) => {
            throw new functions.https.HttpsError("unknown", error.message, error);
          });
      })
      .catch((error) => {
        throw new functions.https.HttpsError("unknown", error.message);
      });
  }
  throw new functions.https.HttpsError(
    "permission-denied",
    "Você não tem permissão para executar essa ação"
  );
});

exports.deletaUsersAutomatico = functions.auth.user().onDelete((user) => {
  console.log(user);
  admin
    .database()
    .ref(`sistemaEscolar/listaDeUsuarios/${user.uid}`)
    .remove()
    .then(() => {
      admin
        .database()
        .ref(`sistemaEscolar/usuarios/${user.uid}`)
        .remove()
        .then(() => {
          console.log("ok deleted");
          return {
            ok: "user deleted"
          };
        })
        .catch((error) => {
          throw new functions.https.HttpsError("unknown", error.message);
        });
    })
    .catch((error) => {
      throw new functions.https.HttpsError("unknown", error.message);
    });
});

exports.criaContaAluno = functions.database
  .ref("sistemaEscolar/alunos/{registro}")
  .onCreate((snapshot) => {
    let aluno = snapshot.after.val();
    admin
      .auth()
      .createUser({
        uid: aluno.matriculaAluno,
        email: aluno.emailAluno,
        emailVerified: false,
        password: aluno.senhaAluno,
        displayName: aluno.nomeAluno,
        phoneNumber: "+55" + aluno.celularAluno
      })
      .then(() => { })
      .catch((error) => {
        throw new functions.https.HttpsError("unknown", error.message, error);
      });
  });

exports.modificaSenhaContaAluno = functions.database
  .ref("sistemaEscolar/alunos/{matricula}/senhaAluno")
  .onUpdate((snapshot, context) => {
    async function start() {
      let senhaAluno = snapshot.after.val();
      let matricula = context.params.matricula;
      let firestoreRef = admin.firestore().collection("mail");
      let dadosAluno = await admin
        .database()
        .ref("sistemaEscolar/alunos/" + matricula)
        .once("value");
      let nomeEscola = await admin
        .database()
        .ref("sistemaEscolar/infoEscola/dadosBasicos/nomeEscola")
        .once("value");
      let user = await admin.auth().getUserByEmail(dadosAluno.val().emailAluno);
      let emailContent = {
        to: dadosAluno.val().emailAluno,
        message: {
          subject: `${nomeEscola.val()}: Senha alterada no portal do Aluno`,
          text: `Sua nova senha para login no portal do aluno é ${senhaAluno}. Em caso de dificuldades entre em contato com sua escola para maiores informações. Sistemas ProjetoX.`,
          html: `<h3>Olá ${dadosAluno.val().nomeAluno.split(" ")[0]
            }!</h3><p>O sistema detectou uma mudança na sua senha do portal do aluno e sua nova senha para login no portal do aluno é <b>${senhaAluno}</b>.</p><p>Em caso de dificuldades <b>entre em contato com sua escola para maiores informações</b>.</p><p>Sistemas ProjetoX.</p>`
        }
      };

      admin
        .auth()
        .updateUser(user.uid, {
          password: senhaAluno
        })
        .then(() => {
          firestoreRef
            .add(emailContent)
            .then(() => {
              console.log("Queued email for delivery to " + dadosAluno.val().emailAluno);
            })
            .catch((error) => {
              console.error(error);
              throw new Error(error.message);
            });
        })
        .catch((error) => {
          console.error(error);
          throw new Error(error.message);
        });
    }

    start(() => {
      return "Function ended";
    }).catch((error) => {
      throw new Error(error.message);
    });
  });

exports.cadastroUser = functions.auth.user().onCreate(async (user) => {
  let dadosNoBanco = admin.database().ref(`sistemaEscolar/usuarios/${user.uid}/`);
  let listaDeUsers = admin.database().ref("sistemaEscolar/listaDeUsuarios");
  let usuariosMaster = admin.database().ref("sistemaEscolar/usuariosMaster");
  let firestoreRef = admin.firestore().collection("mail");

  if (!user.uid.includes("PROF-")) {
    await sendMailToNewUser();
  }

  await addInitialUserData();

  await addUserToListOfUsers();

  await setAccessToNewUser();

  async function setAccessToNewUser() {
    try {
      const snapshot = await usuariosMaster.once("value");
      let lista = snapshot.val();
      let acessosObj = {
        acessos: {
          master: false,
          adm: false,
          secretaria: false,
          professores: false,
          aluno: false
        }
      };

      if (lista && lista.indexOf(user.email) !== -1) {
        await listaDeUsers.child(user.uid + "/acessos/master").set(true);
        acessosObj = {
          master: true,
          adm: false,
          secretaria: false,
          professores: false,
          aluno: false
        };
      } else {
        let isProf = user.uid.includes("PROF-") ? true : false;
        let path = isProf ? "/acessos/professores" : "/acessos/aluno";

        await listaDeUsers.child(user.uid + path).set(true);
        acessosObj = {
          master: false,
          adm: false,
          secretaria: false,
          professores: user.isProf,
          aluno: !user.isProf
        };
      }

      await admin.auth().setCustomUserClaims(user.uid, acessosObj);
    } catch (error) {
      throw new functions.https.HttpsError("unknown", error.message);
    }
  }

  async function addUserToListOfUsers() {
    try {
      await listaDeUsers.child(user.uid).set({
        acessos: {
          master: false,
          adm: false,
          secretaria: false,
          professores: false,
          aluno: false
        },
        email: user.email
      });
    } catch (error) {
      throw new functions.https.HttpsError("unknown", error.message);
    }
  }

  async function addInitialUserData() {
    try {
      await dadosNoBanco.set({
        nome: user.displayName,
        email: user.email,
        timestamp: admin.firestore.Timestamp.now()
      });
    } catch (error) {
      throw new functions.https.HttpsError("unknown", error.message);
    }
  }

  async function sendMailToNewUser() {
    try {
      const emailVerificationLink = await admin.auth().generateEmailVerificationLink(user.email);
      const emailContent = {
        to: user.email,
        message: {
          subject: "Verification of School System Security",
          text: "Click the link to verify your email in the school system",
          html: `
                  <p>Hello, ${user.displayName || "user"}</p>
                  <p>Click this link to verify your email address.</p>
                  <p><a href="${emailVerificationLink}">${emailVerificationLink}</a></p>
                  <p>If you did not request this email verification, please ignore this email.</p>
                  <p>Thank you,</p>
                  <p>ProX Group Team</p>
                `
        }
      };

      await firestoreRef.add(emailContent);
      console.log("Queued email for delivery to " + user.email);
    } catch (error) {
      console.error(error);
    }
  }
});

exports.cadastraTurma = functions.https.onCall(async (data, context) => {
  /**{codigoSala: codPadrao, professor: professor, diasDaSemana: diasDaSemana, livros: books, hora: horarioCurso} */
  console.log(data);
  if (context.auth.token.master === true || context.auth.token.secretaria === true) {
    let dados = data;
    if (dados.hasOwnProperty("codTurmaAtual")) {
      let turma = dados.codTurmaAtual;
      return admin
        .database()
        .ref(`sistemaEscolar/turmas/${turma}/professor/0`)
        .once("value")
        .then((snapshot) => {
          if (snapshot.val()) {
            throw new HttpsError(
              "cancelled",
              "Operação cancelada! Desconecte todos os professores desta turma antes de editar a turma"
            );
          }
          return admin
            .database()
            .ref(`sistemaEscolar/turmas/${turma}`)
            .once("value")
            .then(async (turmaFire) => {
              let dadosTurmaAtual = turmaFire.val();

              async function atualizaAlunos() {
                Object.keys(dadosTurmaAtual.alunos).map(async (matricula) => {
                  await admin
                    .database()
                    .ref("sistemaEscolar/alunos/" + matricula + "/turmaAluno")
                    .set(dados.codigoSala);
                });
              }

              if (dadosTurmaAtual.hasOwnProperty("alunos") &&
                Object.keys(dadosTurmaAtual.alunos).length > 0) {
                await atualizaAlunos();
              }

              // Essa parte se repete com as funções de baixo
              return admin
                .database()
                .ref(`sistemaEscolar/turmas/${turma}`)
                .remove()
                .then(() => {
                  return admin
                    .database()
                    .ref("sistemaEscolar/registroGeral")
                    .push({
                      operacao: "Edição das informações de turma do sistema",
                      timestamp: admin.firestore.Timestamp.now(),
                      userCreator: context.auth.uid,
                      dados: {
                        codTurma: turma
                      }
                    })
                    .then(() => {
                      let horario;
                      let hora = dados.hora.indexOf("_") === -1 ? dados.hora : dados.hora.split("_")[0];
                      if (hora >= 12 && hora <= 17) {
                        horario = "Tarde";
                      } else if (hora >= 18 && hora <= 23) {
                        horario = "Noite";
                      } else if (hora >= 5 && hora <= 11) {
                        horario = "Manha";
                      } else {
                        throw new functions.https.HttpsError(
                          "invalid-argument",
                          "Você deve passar um horário válido"
                        );
                      }
                      return admin
                        .auth()
                        .getUserByEmail(data.professor)
                        .then((user) => {
                          dados.professor = [{
                            nome: user.displayName,
                            email: user.email
                          }];
                          dados.timestamp = admin.firestore.Timestamp.now();
                          dados.id = dados.codigoSala;
                          return admin
                            .database()
                            .ref(
                              `sistemaEscolar/usuarios/${user.uid}/professor/turmas/${data.codigoSala}`
                            )
                            .set(true)
                            .then(() => {
                              return admin
                                .database()
                                .ref(`sistemaEscolar/turmas/${data.codigoSala}/`)
                                .once("value")
                                .then((snapshot) => {
                                  if (snapshot.exists() === false) {
                                    Object.assign(dadosTurmaAtual, dados);
                                    return admin
                                      .database()
                                      .ref(`sistemaEscolar/turmas/${data.codigoSala}/`)
                                      .set(dadosTurmaAtual)
                                      .then(() => {
                                        admin
                                          .database()
                                          .ref("sistemaEscolar/numeros/turmasCadastradas")
                                          .transaction((currentValue) => {
                                            return (currentValue || 0) + 1;
                                          })
                                          .catch((error) => {
                                            throw new functions.https.HttpsError(
                                              "unknown",
                                              error.message,
                                              error
                                            );
                                          });
                                        return admin
                                          .database()
                                          .ref("sistemaEscolar/registroGeral")
                                          .push({
                                            operacao: "Cadastro de Turma",
                                            timestamp: admin.firestore.Timestamp.now(),
                                            userCreator: context.auth.uid,
                                            dados: dados
                                          })
                                          .then(() => {
                                            return {
                                              answer: "A turma e todos os seus registros foram alterados com sucesso."
                                            };
                                          })
                                          .catch((error) => {
                                            throw new functions.https.HttpsError(
                                              "unknown",
                                              error.message,
                                              error
                                            );
                                          });
                                      })
                                      .catch((error) => {
                                        throw new functions.https.HttpsError(
                                          error.code,
                                          error.message,
                                          error
                                        );
                                      });
                                  }
                                  throw new functions.https.HttpsError(
                                    "already-exists",
                                    "Uma turma com o mesmo código já foi criada."
                                  );
                                });
                            })
                            .catch((error) => {
                              throw new functions.https.HttpsError("unknown", error.message, error);
                            });
                        })
                        .catch((error) => {
                          throw new functions.https.HttpsError("unknown", error.message, error);
                        });
                    })
                    .catch((error) => {
                      throw new functions.https.HttpsError("unknown", error.message, error);
                    });
                })
                .catch((error) => {
                  throw new functions.https.HttpsError("unknown", error.message, error);
                });
            })
            .catch((error) => {
              throw new functions.https.HttpsError("unknown", error.message, error);
            });
        })
        .catch((error) => {
          throw new functions.https.HttpsError("unknown", error.message, error);
        });
    }
    data.id = data.codigoSala;
    let horario;
    let hora = dados.hora.indexOf("_") === -1 ? dados.hora : dados.hora.split("_")[0];
    if (hora >= 12 && hora <= 17) {
      horario = "Tarde";
    } else if (hora >= 18 && hora <= 23) {
      horario = "Noite";
    } else if (hora >= 5 && hora <= 11) {
      horario = "Manha";
    } else {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Você deve passar um horário válido"
      );
    }
    return admin
      .auth()
      .getUserByEmail(data.professor)
      .then((user) => {
        dados.professor = [{
          nome: user.displayName,
          email: user.email
        }];
        dados.timestamp = admin.firestore.Timestamp.now();
        return admin
          .database()
          .ref(`sistemaEscolar/usuarios/${user.uid}/professor/turmas/${data.codigoSala}`)
          .set(true)
          .then(() => {
            return admin
              .database()
              .ref(`sistemaEscolar/turmas/${data.codigoSala}/`)
              .once("value")
              .then((snapshot) => {
                if (snapshot.exists() === false) {
                  return admin
                    .database()
                    .ref(`sistemaEscolar/turmas/${data.codigoSala}/`)
                    .set(dados)
                    .then(() => {
                      admin
                        .database()
                        .ref("sistemaEscolar/numeros/turmasCadastradas")
                        .transaction((currentValue) => {
                          return (currentValue || 0) + 1;
                        })
                        .catch((error) => {
                          throw new functions.https.HttpsError("unknown", error.message, error);
                        });
                      return admin
                        .database()
                        .ref("sistemaEscolar/registroGeral")
                        .push({
                          operacao: "Cadastro de Turma",
                          timestamp: admin.firestore.Timestamp.now(),
                          userCreator: context.auth.uid,
                          dados: dados
                        })
                        .then(() => {
                          return {
                            answer: "Turma cadastrada com sucesso."
                          };
                        })
                        .catch((error) => {
                          throw new functions.https.HttpsError("unknown", error.message, error);
                        });
                    })
                    .catch((error) => {
                      throw new functions.https.HttpsError(error.code, error.message, error);
                    });
                }
                throw new functions.https.HttpsError(
                  "already-exists",
                  "Uma turma com o mesmo código já foi criada."
                );
              });
          })
          .catch((error) => {
            throw new functions.https.HttpsError("unknown", error.message, error);
          });
      })
      .catch((error) => {
        throw new functions.https.HttpsError("unknown", error.message, error);
      });
  }
  throw new functions.https.HttpsError(
    "permission-denied",
    "Você não possui permissão para fazer alterações nesta área."
  );
});

exports.cadastraAniversarios = functions.database
  .ref("sistemaEscolar/usuarios/{uid}/dataNascimento")
  .onWrite((snapshot) => {
    let data = snapshot.after.val();
    admin
      .auth()
      .getUserByEmail(data.email)
      .then((user) => {
        admin
          .database()
          .ref("sistemaEscolar/aniversarios/" + (data.mes - 1))
          .push({
            nome: user.displayName,
            email: user.email,
            dataNascimento: {
              dia: data.dia,
              mes: data.mes,
              ano: data.ano
            }
          })
          .then(() => {
            return {
              message: "Aniversario cadastrado"
            };
          })
          .catch((error) => {
            throw new functions.https.HttpsError("unknown", error.message, error);
          });
      })
      .catch((error) => {
        throw new functions.https.HttpsError("unknown", error.message, error);
      });
  });

exports.cadastraProf = functions.https.onCall(async (data, context) => {
  console.log(context.auth.token);

  if (context.auth.token.master === true || context.auth.token.secretaria === true) {
    try {
      let dadosProfessor = data.dados;
      let codContrato = Math.random().toString(36).slice(2);
      let contratos = [codContrato];
      dadosProfessor.matriculaProfessor = "PROF-" + Math.random().toString(36).slice(2);

      let user = await admin.auth().createUser({
        uid: dadosProfessor.matriculaProfessor,
        email: dadosProfessor.emailProfessor,
        emailVerified: false,
        password: dadosProfessor.senhaProfessor,
        displayName: dadosProfessor.nomeProfessor,
        phoneNumber: "+55" + dadosProfessor.celularProfessor
      });

      let firestoreRef = admin.firestore().collection("mail");

      let infoEscola = await admin
        .database()
        .ref("sistemaEscolar/infoEscola/dadosBasicos")
        .once("value");

      let dadosEscola = infoEscola.val();

      let emailContent = {
        to: dadosProfessor.emailProfessor,
        cc: dadosEscola.emailEscola || null,
        message: {
          subject: `${dadosEscola.nomeEscola}`,
          text: `Olá ${dadosProfessor.nomeProfessor.split(" ")[0]
            }, você foi corretamente cadastrado(a) em nosso sistema e está pronto(a) para iniciar essa jornada conosco. Sistemas GrupoProX.`,
          html: `<h3>Olá ${dadosProfessor.nomeProfessor.split(" ")[0]
            }!</h3><p>Você está matriculado(a) no nº de matrícula <b>${dadosProfessor.matriculaProfessor
            }</b>, e está pronto(a) para iniciar os estudos conosco. Use seu e-mail e senha cadastrados para acessar o sistema. Só lembrando, sua senha é: <b>${dadosProfessor.senhaProfessor
            }</b>. Fique atento aos e-mails, pois sua escola pode utilizar este canal para comunicação com você.</p><p>Em caso de dificuldades <b>entre em contato com a escola para maiores informações</b>.</p><p><b>Dados de contato da escola:</b><br>Telefone: ${dadosEscola.telefoneEscola
            }<br>E-mail: ${dadosEscola.emailEscola}<br>Endereço: ${dadosEscola.enderecoEscola
            }</p><p>Sistemas GrupoProX.</p>`
        }
      };

      dadosProfessor.userCreator = context.auth.uid;
      dadosProfessor.contratos = contratos;
      dadosProfessor.timestamp = admin.firestore.Timestamp.now();

      return admin
        .database()
        .ref("sistemaEscolar/professores")
        .child(user.uid)
        .once("value")
        .then(async (professorRecord) => {
          if (professorRecord.exists()) {
            throw new functions.https.HttpsError(
              "already-exists",
              "Este número de matrícula já consta no sistema. Por favor, clique no botão azul no início deste formulário para atualizar o número de matrícula, para gerar um novo número de matrícula."
            );
          }

          await admin.database().ref(`sistemaEscolar/professores/${user.uid}`).set(dadosProfessor);

          // await admin
          //   .database()
          //   .ref("sistemaEscolar/infoEscola/contratos/" + codContrato)
          //   .set({
          //     // contratoConfigurado: contratoConfigurado,
          //     situacao: "Vigente",
          //     // planoOriginal: planoOriginal,
          //     matricula: dadosProfessor.matriculaProfessor,
          //     timestamp: admin.firestore.Timestamp.now(),
          //     codContrato: codContrato,
          //     tipo: "professor"
          //   });

          await firestoreRef.add(emailContent);

          console.log("Queued email for delivery to " + dadosProfessor.emailProfessor);

          return {
            answer: "Professor cadastrado na matrícula " +
              dadosProfessor.matriculaProfessor +
              " com sucesso! Os e-mails foram disparados.",
            codContrato: codContrato
          };
        });
    } catch (error) {
      throw new functions.https.HttpsError("unknown", error.message, error);
    }
  }
  throw new functions.https.HttpsError(
    "permission-denied",
    "Você não possui permissão para fazer alterações nesta área."
  );
});

exports.addNovoProfTurma = functions.https.onCall((data, context) => {
  if (context.auth.token.master === true || context.auth.token.secretaria === true) {
    return admin
      .auth()
      .getUserByEmail(data.emailProf)
      .then((user) => {
        return admin
          .database()
          .ref(`sistemaEscolar/usuarios/${user.uid}/professor/turmas/${data.codSala}`)
          .set(true)
          .then(() => {
            return admin
              .database()
              .ref("sistemaEscolar/turmas")
              .child(data.codSala)
              .child("professor")
              .once("value")
              .then((snapshot) => {
                let listaProf = snapshot.val();
                if (listaProf === null) {
                  listaProf = [];
                }
                listaProf.push({
                  email: data.emailProf,
                  nome: user.displayName
                });
                return admin
                  .database()
                  .ref("sistemaEscolar/turmas")
                  .child(data.codSala)
                  .child("professor")
                  .set(listaProf)
                  .then(() => {
                    return admin
                      .database()
                      .ref("sistemaEscolar/registroGeral")
                      .push({
                        operacao: "Professor conectado em uma turma",
                        timestamp: admin.firestore.Timestamp.now(),
                        userCreator: context.auth.uid,
                        dados: data
                      })
                      .then(() => {
                        return {
                          answer: "Professor adicionado com sucesso"
                        };
                      })
                      .catch((error) => {
                        throw new functions.https.HttpsError("unknown", error.message, error);
                      });
                  })
                  .catch((error) => {
                    throw new functions.https.HttpsError("unknown", error.message, error);
                  });
              })
              .catch((error) => {
                throw new functions.https.HttpsError("unknown", error.message, error);
              });
          })
          .catch((error) => {
            throw new functions.https.HttpsError("unknown", error.message, error);
          });
      })
      .catch((error) => {
        throw new functions.https.HttpsError("unknown", error.message, error);
      });
  }
  throw new functions.https.HttpsError(
    "permission-denied",
    "Você não possui permissão para fazer alterações nesta área."
  );
});

exports.desconectaProf = functions.database
  .ref("sistemaEscolar/turmas/{codTurma}/professor/{iProf}")
  .onDelete((snapshot, context) => {
    // context.params = { codTurma: 'KIDS-SAT08', iProf: '1' }
    // context.timestamp = context.timestamp

    let turma = context.params.codTurma;
    let professor = snapshot.val().email;
    return admin
      .auth()
      .getUserByEmail(professor)
      .then((user) => {
        return admin
          .database()
          .ref(`sistemaEscolar/usuarios/${user.uid}/professor/turmas/${turma}`)
          .remove()
          .then(() => {
            return admin
              .database()
              .ref(`sistemaEscolar/turmas/${turma}/professor`)
              .once("value")
              .then((teachersData) => {
                if (teachersData.exists()) {
                  let teachers = teachersData.val();
                  let teachersArray = [];
                  for (const i in teachers) {
                    if (Object.hasOwnProperty.call(teachers, i)) {
                      const teacher = teachers[i];
                      teachersArray.push(teacher);
                    }
                  }

                  return admin
                    .database()
                    .ref(`sistemaEscolar/turmas/${turma}/professor`)
                    .set(teachersArray)
                    .then(() => {
                      return {
                        answer: "Professor desconectado."
                      };
                    })
                    .catch((error) => {
                      throw new HttpsError("unknown", error);
                    });
                }
              });
          })
          .catch((error) => {
            throw new HttpsError("unknown", error);
          });
      })
      .catch((error) => {
        throw new HttpsError("not-found", error.message, error);
      });
  });

exports.cadastraAluno = functions.https.onCall(async (data, context) => {
  function formataNumMatricula(num) {
    let numero = num;
    numero = "00000" + numero.replace(/\D/g, "");
    numero = numero.slice(-5, -1) + numero.slice(-1);
    return numero;
  }
  if (
    data.dados.tipoMatricula === "preMatricula" ||
    context.auth.token.master === true ||
    context.auth.token.secretaria === true
  ) {
    let dadosAluno = data.dados;
    if (dadosAluno.tipoMatricula === "preMatricula") {
      delete dadosAluno.tipoMatricula;

      let firestoreRef = admin.firestore().collection("mail");
      let infoEscola = await admin
        .database()
        .ref("sistemaEscolar/infoEscola/dadosBasicos")
        .once("value");
      let dadosEscola = infoEscola.val();
      let responsavelPedagogico = {
        email: null
      };
      try {
        responsavelPedagogico =
          dadosAluno.responsaveis.find((responsavel) => responsavel.pedagogico === true) ||
          dadosAluno.responsaveis[0];
      } catch (error) {
        console.log(error);
      }

      dadosAluno.timestamp = admin.firestore.Timestamp.now();
      dadosAluno.userCreator = "Anonymous";

      let emailContent = {
        to: dadosAluno.emailAluno,
        cc: dadosAluno.emailResponsavelPedagogico || null,
        message: {
          subject: `${dadosEscola.nomeEscola}`,
          text: `Olá ${dadosAluno.nomeAluno.split(" ")[0]
            }, sua pré matrícula foi cadastrada. Sistemas GrupoProX.`,
          html: `<h3>Olá ${dadosAluno.nomeAluno.split(" ")[0]
            }!</h3><p>Sua Pré-Matrícula foi cadastrada com sucesso. Fique atento aos e-mails. Nós poderemos utilizar este meio para entrar em contato e passar informações importantes.</p><p>Em caso de dúvidas ou dificuldades <b>entre em contato com a escola para maiores informações</b>.</p><p><b>Dados de contato da escola:</b><br>Telefone: ${dadosEscola.telefoneEscola
            }<br>E-mail: ${dadosEscola.emailEscola}<br>Endereço: ${dadosEscola.enderecoEscola
            }</p><p>Sistemas GrupoProX.</p>`
        }
      };

      return admin
        .database()
        .ref("/sistemaEscolar/preMatriculas")
        .push(dadosAluno)
        .then(() => {
          return firestoreRef
            .add(emailContent)
            .then(() => {
              console.log("Queued email for delivery to " + dadosAluno.emailAluno);
              return {
                answer: "Pré-matrícula enviada com sucesso! Um e-mail será enviado para o aluno, informando sobre este cadastro."
              };
            })
            .catch((error) => {
              console.error(error);
              throw new Error(error.message);
            });
        })
        .catch((error) => {
          throw new functions.https.HttpsError("unknown", error.message, error);
        });
    }
    let preMatriculaKey = data.preMatricula;
    delete dadosAluno.tipoMatricula;
    let contratoConfigurado = data.contratoConfigurado;
    let planoOriginal = data.planoOriginal;
    let codContrato = !data.codContrato ? admin.database().ref("/").push().key : data.codContrato;
    let contratos = [codContrato];
    let ultimaMatricula = (
      await admin.database().ref("sistemaEscolar/ultimaMatricula").once("value")
    ).val();
    dadosAluno.matriculaAluno = !dadosAluno.matriculaAluno ?
      formataNumMatricula(String(Number(ultimaMatricula) + 1)) :
      dadosAluno.matriculaAluno;
    let firestoreRef = admin.firestore().collection("mail");
    let infoEscola = await admin
      .database()
      .ref("sistemaEscolar/infoEscola/dadosBasicos")
      .once("value");
    let dadosEscola = infoEscola.val();
    let emailContent = {
      to: dadosAluno.emailAluno,
      cc: dadosAluno.emailResponsavelPedagogico || null,
      message: {
        subject: `${dadosEscola.nomeEscola}`,
        text: `Olá ${dadosAluno.nomeAluno.split(" ")[0]
          }, você foi corretamente cadastrado(a) em nosso sistema e está pronto(a) para iniciar essa jornada conosco. Sistemas GrupoProX.`,
        html: `<h3>Olá ${dadosAluno.nomeAluno.split(" ")[0]
          }!</h3><p>Você está matriculado(a) no nº de matrícula <b>${dadosAluno.matriculaAluno
          }</b>, e está pronto(a) para iniciar os estudos conosco. Use seu e-mail e senha cadastrados para acessar o sistema. Só lembrando, sua senha é: <b>${dadosAluno.senhaAluno
          }</b>. Fique atento aos e-mails, pois sua escola pode utilizar este canal para comunicação com você.</p><p>Em caso de dificuldades <b>entre em contato com a escola para maiores informações</b>.</p><p><b>Dados de contato da escola:</b><br>Telefone: ${dadosEscola.telefoneEscola
          }<br>E-mail: ${dadosEscola.emailEscola}<br>Endereço: ${dadosEscola.enderecoEscola
          }</p><p>Sistemas GrupoProX.</p>`
      }
    };
    dadosAluno.userCreator = context.auth.uid;
    dadosAluno.contratos = contratos;
    dadosAluno.timestamp = admin.firestore.Timestamp.now();
    return admin
      .database()
      .ref("sistemaEscolar/alunos")
      .child(dadosAluno.matriculaAluno)
      .once("value")
      .then((alunoRecord) => {
        if (alunoRecord.exists()) {
          throw new functions.https.HttpsError(
            "already-exists",
            "Este número de matrícula já consta no sistema. Por favor, clique no botão azul no início deste formulário para atualizar o número de matrícula, para gerar um novo número de matrícula."
          );
        }
        return admin
          .database()
          .ref("sistemaEscolar/alunos/" + dadosAluno.matriculaAluno)
          .set(dadosAluno)
          .then(() => {
            return admin
              .database()
              .ref("sistemaEscolar/infoEscola/contratos/" + codContrato)
              .set({
                contratoConfigurado: contratoConfigurado,
                situacao: "Vigente",
                planoOriginal: planoOriginal,
                matricula: dadosAluno.matriculaAluno,
                timestamp: admin.firestore.Timestamp.now(),
                codContrato: codContrato
              })
              .then(() => {
                return admin
                  .database()
                  .ref("sistemaEscolar/turmas")
                  .child(dadosAluno.turmaAluno + "/alunos")
                  .child(dadosAluno.matriculaAluno)
                  .set({
                    nome: dadosAluno.nomeAluno,
                    prof: dadosAluno.emailProfAluno || dadosAluno.profAluno.email
                  })
                  .then(() => {
                    return admin
                      .database()
                      .ref("sistemaEscolar/ultimaMatricula")
                      .set(dadosAluno.matriculaAluno)
                      .then(() => {
                        if (preMatriculaKey) {
                          admin
                            .database()
                            .ref("sistemaEscolar/preMatriculas")
                            .child(preMatriculaKey)
                            .remove()
                            .then(() => { })
                            .catch((error) => {
                              functions.logger.log(error);
                            });
                        }

                        admin
                          .database()
                          .ref("sistemaEscolar/numeros/alunosMatriculados")
                          .transaction(
                            (currentValue) => {
                              let numAtual = Number(currentValue);
                              if (currentValue === null) {
                                return 1;
                              }
                              return numAtual++;
                            },
                            (error, comitted) => {
                              if (error) {
                                throw new functions.https.HttpsError(
                                  error.code,
                                  error.message,
                                  error
                                );
                              } else if (!comitted) {
                                throw new functions.https.HttpsError(
                                  "already-exists",
                                  "Já existe. Isso pode ser um erro. Tente novamente."
                                );
                              }
                            }
                          );

                        return firestoreRef
                          .add(emailContent)
                          .then(() => {
                            console.log("Queued email for delivery to " + dadosAluno.emailAluno);
                            return {
                              answer: "Aluno cadastrado na matrícula " +
                                dadosAluno.matriculaAluno +
                                " com sucesso! Os e-mails foram disparados.",
                              codContrato: codContrato
                            };
                          })
                          .catch((error) => {
                            console.error(error);
                            throw new Error(error.message);
                          });
                      })
                      .catch((error) => {
                        throw new functions.https.HttpsError("unknown", error.message, error);
                      });
                  })
                  .catch((error) => {
                    throw new functions.https.HttpsError("unknown", error.message, error);
                  });
              })
              .catch((error) => {
                throw new functions.https.HttpsError("unknown", error.message, error);
              });
          })
          .catch((error) => {
            throw new functions.https.HttpsError("unknown", error.message, error);
          });
      })
      .catch((error) => {
        throw new functions.https.HttpsError("unknown", error.message, error);
      });
  }
  throw new functions.https.HttpsError(
    "permission-denied",
    "Você não possui permissão para fazer alterações nesta área."
  );
});

exports.timestamp = functions.https.onCall(() => {
  return {
    timestamp: admin.firestore.Timestamp.now()
  };
});

exports.transfereAlunos = functions.https.onCall((data, context) => {
  function formataNumMatricula(num) {
    let numero = num;
    numero = "00000" + numero.replace(/\D/g, "");
    numero = numero.slice(-5, -1) + numero.slice(-1);
    return numero;
  }
  if (context.auth.token.master === true || context.auth.token.secretaria === true) {
    let dados = data;
    let turmaAtual = dados.turmaAtual;
    let turmaParaTransferir = dados.turmaParaTransferir;
    let alunosSelecionados = dados.alunos;
    let alunos = {}; //Aqui onde será guardado os alunos e os dados dos mesmos, da turma para serem transferidos para outra turma
    let timestamp = admin.firestore.Timestamp.now();

    return admin
      .database()
      .ref(`sistemaEscolar/turmas/${turmaAtual}/alunos/`)
      .once("value")
      .then((snapshot) => {
        let alunosTurma = snapshot.val();
        for (const i in alunosSelecionados) {
          if (Object.hasOwnProperty.call(alunosSelecionados, i)) {
            const matricula = alunosSelecionados[i];
            alunos[formataNumMatricula(matricula)] = alunosTurma[formataNumMatricula(matricula)];
          }
        }
        console.log(alunos);

        return admin
          .database()
          .ref(`sistemaEscolar/turmas/${turmaParaTransferir}/alunos/`)
          .update(alunos)
          .then(() => {
            async function removeAlunos() {
              for (const matricula in alunos) {
                if (Object.hasOwnProperty.call(alunos, matricula)) {
                  const dadosAluno = alunos[matricula];
                  await admin
                    .database()
                    .ref(`sistemaEscolar/turmas/${turmaAtual}/historico`)
                    .push({
                      dados: {
                        matricula: matricula,
                        dadosAluno: dadosAluno,
                        turmaAtual: turmaAtual,
                        turmaParaQualFoiTransferido: turmaParaTransferir
                      },
                      timestamp: timestamp,
                      operacao: "Transferência de alunos"
                    })
                    .then(() => {
                      admin
                        .database()
                        .ref(`sistemaEscolar/turmas/${turmaAtual}/alunos/${matricula}`)
                        .remove()
                        .then(() => {
                          admin
                            .database()
                            .ref(`sistemaEscolar/turmas/${turmaParaTransferir}/professor/0`)
                            .once("value")
                            .then((novoProfessor) => {
                              admin
                                .database()
                                .ref(
                                  `sistemaEscolar/turmas/${turmaParaTransferir}/alunos/${matricula}/prof/`
                                )
                                .set(novoProfessor.val())
                                .then(() => {
                                  admin
                                    .database()
                                    .ref(`sistemaEscolar/alunos/${matricula}/profAluno/`)
                                    .set(novoProfessor.val())
                                    .then(() => {
                                      admin
                                        .database()
                                        .ref(`sistemaEscolar/alunos/${matricula}/turmaAluno/`)
                                        .set(turmaParaTransferir)
                                        .then(() => {
                                          admin
                                            .database()
                                            .ref(`sistemaEscolar/alunos/${matricula}/historico/`)
                                            .push({
                                              dados: {
                                                matricula: matricula,
                                                dadosAluno: dadosAluno,
                                                turmaAtual: turmaAtual,
                                                turmaParaQualFoiTransferido: turmaParaTransferir
                                              },
                                              timestamp: timestamp,
                                              operacao: "Transferência de alunos",
                                              userCreator: context.auth.uid
                                            })
                                            .then(() => { })
                                            .catch((error) => {
                                              throw new functions.https.HttpsError(
                                                "unknown",
                                                error.message,
                                                error
                                              );
                                            });
                                        })
                                        .catch((error) => {
                                          throw new functions.https.HttpsError(
                                            "unknown",
                                            error.message,
                                            error
                                          );
                                        });
                                    })
                                    .catch((error) => {
                                      throw new functions.https.HttpsError(
                                        "unknown",
                                        error.message,
                                        error
                                      );
                                    });
                                })
                                .catch((error) => {
                                  throw new functions.https.HttpsError(
                                    "unknown",
                                    error.message,
                                    error
                                  );
                                });
                            })
                            .catch((error) => {
                              throw new functions.https.HttpsError("unknown", error.message, error);
                            });
                        })
                        .catch((error) => {
                          throw new functions.https.HttpsError("unknown", error.message, error);
                        });
                    })
                    .catch((error) => {
                      throw new functions.https.HttpsError("unknown", error.message, error);
                    });
                }
              }
            }
            return removeAlunos()
              .then(() => {
                return {
                  answer: "Os alunos foram transferidos para a outra turma com sucesso."
                };
              })
              .catch((error) => {
                throw new functions.https.HttpsError("unknown", error.message, error);
              });
          })
          .catch((error) => {
            throw new functions.https.HttpsError("unknown", error.message, error);
          });
      })
      .catch((error) => {
        throw new functions.https.HttpsError("unknown", error.message, error);
      });
  }
  throw new functions.https.HttpsError("permission-denied", "Você não tem permissão.");
});

exports.excluiTurma = functions.https.onCall((data, context) => {
  if (context.auth.token.master === true || context.auth.token.secretaria === true) {
    let turma = data.codTurma;
    return admin
      .database()
      .ref(`sistemaEscolar/turmas/${turma}/alunos`)
      .once("value")
      .then((students) => {
        if (students.val()) {
          throw new HttpsError("cancelled", "Operação cancelada! Desative ou transfira os alunos.");
        }
        return admin
          .database()
          .ref(`sistemaEscolar/turmas/${turma}/professor`)
          .once("value")
          .then((snapshot) => {
            if (snapshot.val()) {
              throw new HttpsError(
                "cancelled",
                "Operação cancelada! Desconecte todos os professores desta turma antes de excluir a turma"
              );
            }
            return admin
              .database()
              .ref(`sistemaEscolar/turmas/${turma}`)
              .remove()
              .then(() => {
                return admin
                  .database()
                  .ref("sistemaEscolar/registroGeral")
                  .push({
                    operacao: "Exclusão de turma do sistema",
                    timestamp: admin.firestore.Timestamp.now(),
                    userCreator: context.auth.uid,
                    dados: {
                      codTurma: turma
                    }
                  })
                  .then(() => {
                    return {
                      answer: "A turma e todos os seus registros foram excluídos com sucesso."
                    };
                  })
                  .catch((error) => {
                    throw new functions.https.HttpsError("unknown", error.message, error);
                  });
              })
              .catch((error) => {
                throw new functions.https.HttpsError("unknown", error.message, error);
              });
          })
          .catch((error) => {
            throw new functions.https.HttpsError("unknown", error.message, error);
          });
      })
      .catch((error) => {
        throw new functions.https.HttpsError("unknown", error.message, error);
      });
  }
  throw new functions.https.HttpsError(
    "permission-denied",
    "Você não possui permissão para fazer alterações nesta área."
  );
});

exports.ativaDesativaAlunos = functions.https.onCall((data, context) => {
  function formataNumMatricula(num) {
    let numero = num;
    numero = "00000" + numero.replace(/\D/g, "");
    numero = numero.slice(-5, -1) + numero.slice(-1);
    return numero;
  }
  if (context.auth.token.master === true || context.auth.token.secretaria === true) {
    let alunos = data.alunos;
    let turma = data.codTurma;
    let timestamp = admin.firestore.Timestamp.now();
    if (data.modo === "ativa") {
      async function ativaAlunos() {
        let dadosAluno;
        let dadosTurma;
        for (const matriculaNum in alunos) {
          if (Object.hasOwnProperty.call(alunos, matriculaNum)) {
            let matricula = formataNumMatricula(matriculaNum);
            await admin
              .database()
              .ref(`sistemaEscolar/alunosDesativados/${matricula}/dadosAluno`)
              .once("value")
              // eslint-disable-next-line no-loop-func
              .then((snapshot) => {
                dadosAluno = snapshot.val();
                console.log(dadosAluno);

                admin
                  .database()
                  .ref(`sistemaEscolar/alunosDesativados/${matricula}/dadosTurma`)
                  .once("value")
                  .then((snapshotTurma) => {
                    dadosTurma = snapshotTurma.val();

                    admin
                      .database()
                      .ref(`sistemaEscolar/alunos/${matricula}/`)
                      .set(dadosAluno)
                      .then(() => {
                        admin
                          .database()
                          .ref(`sistemaEscolar/alunosDesativados/${matricula}`)
                          .remove()
                          .then(() => {
                            admin
                              .database()
                              .ref(`sistemaEscolar/turmas/${turma}/alunos/${matricula}/`)
                              .set(dadosTurma)
                              .then(() => {
                                admin
                                  .database()
                                  .ref(`sistemaEscolar/alunos/${matricula}/historico`)
                                  .push({
                                    dados: {
                                      dadosTurma: dadosTurma,
                                      turmaAtivacao: turma
                                    },
                                    timestamp: timestamp,
                                    operacao: "Reativação de aluno"
                                  })
                                  .then(() => {
                                    admin
                                      .database()
                                      .ref(`sistemaEscolar/alunos/${matricula}/turmaAluno`)
                                      .set(turma)
                                      .then(() => { })
                                      .catch((error) => {
                                        throw new functions.https.HttpsError(
                                          "unknown",
                                          error.message,
                                          error
                                        );
                                      });
                                  })
                                  .catch((error) => {
                                    throw new functions.https.HttpsError(
                                      "unknown",
                                      error.message,
                                      error
                                    );
                                  });
                              })
                              .catch((error) => {
                                throw new functions.https.HttpsError(
                                  "unknown",
                                  error.message,
                                  error
                                );
                              });
                          })
                          .catch((error) => {
                            throw new functions.https.HttpsError("unknown", error.message, error);
                          });
                      })
                      .catch((error) => {
                        throw new functions.https.HttpsError("unknown", error.message, error);
                      });
                  })
                  .catch((error) => {
                    throw new functions.https.HttpsError("unknown", error.message, error);
                  });
              })
              .catch((error) => {
                throw new functions.https.HttpsError("unknown", error.message, error);
              });
          }
        }
      }

      return ativaAlunos()
        .then(() => {
          return {
            answer: "Os alunos selecionados foram reativados com sucesso."
          };
        })
        .catch((error) => {
          throw new functions.https.HttpsError("unknown", error.message, error);
        });
    } else if (data.modo === "desativa") {
      async function desativaAlunos() {
        let dadosAluno;
        let dadosTurma;
        for (const matriculaNum in alunos) {
          if (Object.hasOwnProperty.call(alunos, matriculaNum)) {
            let matricula = formataNumMatricula(matriculaNum);
            admin
              .database()
              .ref(`sistemaEscolar/alunos/${matricula}`)
              .once("value")
              // eslint-disable-next-line no-loop-func
              .then((snapshot) => {
                dadosAluno = snapshot.val();
                console.log(dadosAluno);
                turma = dadosAluno.turmaAluno;
                admin
                  .database()
                  .ref(`sistemaEscolar/turmas/${turma}/alunos/${matricula}/`)
                  .once("value")
                  .then((snapshotTurma) => {
                    dadosTurma = snapshotTurma.val();

                    admin
                      .database()
                      .ref(`sistemaEscolar/alunosDesativados/${matricula}/`)
                      .set({
                        dadosAluno: dadosAluno,
                        dadosTurma: dadosTurma
                      })
                      .then(() => {
                        admin
                          .database()
                          .ref(`sistemaEscolar/alunos/${matricula}`)
                          .remove()
                          .then(() => {
                            admin
                              .database()
                              .ref(`sistemaEscolar/turmas/${turma}/alunos/${matricula}/`)
                              .remove()
                              .then(() => {
                                admin
                                  .database()
                                  .ref(
                                    `sistemaEscolar/alunosDesativados/${matricula}/dadosAluno/historico`
                                  )
                                  .push({
                                    dados: {
                                      dadosTurma: dadosTurma,
                                      turma: turma
                                    },
                                    timestamp: timestamp,
                                    operacao: "Desativação de aluno"
                                  })
                                  .then(() => { })
                                  .catch((error) => {
                                    throw new functions.https.HttpsError(
                                      "unknown",
                                      error.message,
                                      error
                                    );
                                  });
                              })
                              .catch((error) => {
                                throw new functions.https.HttpsError(
                                  "unknown",
                                  error.message,
                                  error
                                );
                              });
                          })
                          .catch((error) => {
                            throw new functions.https.HttpsError("unknown", error.message, error);
                          });
                      })
                      .catch((error) => {
                        throw new functions.https.HttpsError("unknown", error.message, error);
                      });
                  })
                  .catch((error) => {
                    throw new functions.https.HttpsError("unknown", error.message, error);
                  });
              })
              .catch((error) => {
                throw new functions.https.HttpsError("unknown", error.message, error);
              });
          }
        }
      }

      return desativaAlunos()
        .then(() => {
          return {
            answer: "Os alunos selecionados foram desativados com sucesso."
          };
        })
        .catch((error) => {
          throw new functions.https.HttpsError("unknown", error.message, error);
        });
    }
    throw new functions.https.HttpsError(
      "aborted",
      "A operação foi abortada pois não foi passado o modo da operação"
    );
  } else {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Você não possui permissão para fazer alterações nesta área."
    );
  }
});

exports.lancarNotas = functions.https.onCall((data, context) => {
  // data: {alunos: {matricula: nomeAluno}, turma: codTurma, notas: {ativ1: 50, ativ2: 50}}
  if (context.auth.token.master === true || context.auth.token.professores === true) {
    function formataNumMatricula(num) {
      let numero = num;
      numero = "00000" + numero.replace(/\D/g, "");
      numero = numero.slice(-5, -1) + numero.slice(-1);
      return numero;
    }
    let dados = data;
    let alunos = dados.alunos;
    let turma = dados.turma;
    let notas = dados.notas;

    let alunosTurmaRef = admin.database().ref("sistemaEscolar/turmas/" + turma + "/alunos");
    async function lancar() {
      for (const matricula in alunos) {
        if (Object.hasOwnProperty.call(alunos, matricula)) {
          alunosTurmaRef
            .child(formataNumMatricula(matricula) + "/notas")
            .set(notas)
            .then(() => {
              return admin
                .database()
                .ref("sistemaEscolar/registroGeral")
                .push({
                  operacao: "Lançamento de notas",
                  timestamp: admin.firestore.Timestamp.now(),
                  userCreator: context.auth.uid,
                  dados: dados
                })
                .then(() => { })
                .catch((error) => {
                  throw new functions.https.HttpsError("unknown", error.message, error);
                });
            })
            .catch((error) => {
              throw new functions.https.HttpsError("unknown", error.message, error);
            });
        }
      }
    }
    return lancar()
      .then(() => {
        return {
          answer: "As notas lançadas com sucesso. Aguarde um momento até que o sistema atualize as notas automaticamente."
        };
      })
      .catch((error) => {
        throw new functions.https.HttpsError("unknown", error.message, error);
      });
  }
  throw new functions.https.HttpsError(
    "permission-denied",
    "Você não possui permissão para fazer alterações nesta área."
  );
});

exports.lancaDesempenhos = functions.database
  .ref("sistemaEscolar/turmas/{codTurma}/alunos/{matricula}/desempenho")
  .onWrite((snapshot, context) => {
    // context.timestamp = context.timestamp
    // context.params = { codTurma: 'KIDS-SAT08', matricula: '00001' }

    let notasDesempenho = snapshot.after.val();
    let referencia = {
      turma: context.params.codTurma,
      matriculaAluno: context.params.matricula
    };

    return admin
      .database()
      .ref(`sistemaEscolar/turmas/${referencia.turma}/status/turma`)
      .once("value")
      .then((status) => {
        if (status === "aberta") {
          return admin
            .database()
            .ref(`sistemaEscolar/turmas/${referencia.turma}/notas/Desempenho`)
            .once("value")
            .then((notasDesempenhoTurma) => {
              if (notasDesempenhoTurma.exists()) {
                let somatorioDesempenho = 0;
                for (const nomeNota in notasDesempenho) {
                  if (Object.hasOwnProperty.call(notasDesempenho, nomeNota)) {
                    const valor = notasDesempenho[nomeNota];
                    somatorioDesempenho += valor;
                  }
                }

                return admin
                  .database()
                  .ref(
                    `sistemaEscolar/turmas/${referencia.turma}/alunos/${referencia.matriculaAluno}/notas/Desempenho`
                  )
                  .set(somatorioDesempenho)
                  .then(() => {
                    return (
                      "Somatório de desempenho da matricula " +
                      referencia.matriculaAluno +
                      " foi alterado na turma " +
                      referencia.turma
                    );
                  })
                  .catch((error) => {
                    throw new functions.https.HttpsError("unknown", error.message, error);
                  });
              }
              return (
                "A turma " +
                referencia.turma +
                "não possui nota de desempenho distribuída no somatório final das notas. A nota da matricula " +
                referencia.matriculaAluno +
                " não foi alterada."
              );
            })
            .catch((error) => {
              throw new functions.https.HttpsError("unknown", error.message, error);
            });
        }
        throw new functions.https.HttpsError(
          "permission-denied",
          "Você só pode lançar notas em uma turma aberta"
        );
      })
      .catch((error) => {
        throw new functions.https.HttpsError("unknown", error.message, error);
      });
  });

exports.aberturaTurma = functions.database
  .ref("sistemaEscolar/turmas/{turma}/status/turma")
  .onUpdate((snapshot, context) => {
    // context.timestamp = context.timestamp
    // context.params = { turma: "cod da turma" }
    const classState = snapshot.after.val();

    // checking if the class status is "opened"
    if (classState === "aberta") {
      console.log("aberto");
    }
  });

exports.fechaTurma = functions.https.onCall(async (data, context) => {
  function formataNumMatricula(num) {
    let numero = num;
    numero = "00000" + numero.replace(/\D/g, "");
    numero = numero.slice(-5, -1) + numero.slice(-1);
    return numero;
  }
  if (context.auth.token.master === true || context.auth.token.professores === true) {
    let turma = data;
    let turmaRef = admin.database().ref(`sistemaEscolar/turmas/${turma}`);
    let alunosRef = admin.database().ref("sistemaEscolar/alunos/");
    let chave = alunosRef.push().key;
    try {
      const dadosTurma = await turmaRef
        .once("value");
      async function sequenciaDeFechamento(dadosDaTurma) {
        delete dadosDaTurma.historicoEscolar;
        turmaRef
          .child("status/turma")
          .set("fechada")
          .then(() => { })
          .catch((error) => {
            throw new Error(error.message);
          });

        let aulaEvento = (await turmaRef.child("aulaEvento").once("value")).val();

        turmaRef
          .child("historicoEscolar/" + chave)
          .set({
            dadosDaTurma: dadosDaTurma,
            timestamp: admin.firestore.Timestamp.now(),
            codTurma: dadosDaTurma.codigoSala,
            aulaEvento: aulaEvento
          })
          .then(() => { })
          .catch((error) => {
            throw new Error(error.message);
          });

        turmaRef
          .child("frequencia")
          .remove()
          .then(() => { })
          .catch((error) => {
            throw new Error(error.message);
          });

        for (const matricula in dadosDaTurma.alunos) {
          if (Object.hasOwnProperty.call(dadosDaTurma.alunos, matricula)) {
            let infoAluno = dadosDaTurma.alunos[matricula];
            infoAluno.notasReferencia = dadosDaTurma.notas;
            infoAluno.timestamp = admin.firestore.Timestamp.now();
            infoAluno.codigoSala = dadosDaTurma.codigoSala;
            infoAluno.inicio = dadosDaTurma.status.inicio;
            infoAluno.fim = dadosDaTurma.status.fim;
            infoAluno.qtdeAulas = dadosDaTurma.status.qtdeAulas;
            infoAluno.livros = dadosDaTurma.livros;
            infoAluno.curso = dadosDaTurma.curso;
            infoAluno.nomePeriodo = dadosDaTurma.status.nomePeriodo;
            infoAluno.professor = dadosDaTurma.professor;
            alunosRef
              .child(formataNumMatricula(matricula) + "/historicoEscolar/" + chave)
              .set({
                infoAluno: infoAluno,
                timestamp: admin.firestore.Timestamp.now(),
                turma: dadosDaTurma.codigoSala,
                aulaEvento: aulaEvento
              })
              .then(() => { })
              .catch((error) => {
                throw new Error(error.message);
              });
            turmaRef
              .child("alunos/" + formataNumMatricula(matricula))
              .set({
                nome: infoAluno.nome
              })
              .then(() => { })
              .catch((error) => {
                throw new Error(error.message);
              });
          }
        }
        admin
          .database()
          .ref("sistemaEscolar/registroGeral")
          .push({
            operacao: "Fechamento de Turma",
            timestamp: admin.firestore.Timestamp.now(),
            userCreator: context.auth.uid,
            dados: {
              codTurma: dadosDaTurma.codigoSala
            }
          })
          .then(() => { })
          .catch((error) => {
            throw new functions.https.HttpsError("unknown", error.message, error);
          });
        await turmaRef.child("aulaEvento").remove();
      }
      try {
        const callback = await sequenciaDeFechamento(dadosTurma.val());
        return {
          answer: "A sequência de fechamento da turma foi concluída com sucesso.",
          callback: callback
        };
      } catch (error) {
        throw new functions.https.HttpsError("unknown", error.message, error);
      }
    } catch (error) {
      throw new functions.https.HttpsError("unknown", error.message, error);
    }
  }
  throw new functions.https.HttpsError(
    "permission-denied",
    "Você não possui permissão para fazer alterações nesta área."
  );
});

exports.aberturaChamados = functions.database
  .ref("sistemaEscolar/chamados/{key}")
  .onCreate(async (snapshot, context) => {
    function convertTimestamp(timestamp) {
      let time = new Date(timestamp._seconds * 1000);

      return time;
    }

    const priorities = ["Baixa", "Média", "Alta", "Crítica"];
    const emailSuporte = "suporte@grupoprox.com";
    const key = context.params.key;
    let chamado = snapshot.val();
    chamado.timestamp = admin.firestore.Timestamp.now();
    chamado.situacao = 0;

    await admin.database().ref("sistemaEscolar/chamados").child(key).set(chamado);

    let imagens = "";
    try {
      if (!chamado.imagens) {
        imagens = "O solicitante não anexou imagens ao chamado.";
      }
      for (const i in chamado.imagens) {
        if (Object.hasOwnProperty.call(chamado.imagens, i)) {
          const url = chamado.imagens[i];
          imagens += `<a href="${url}" target="_blank">Imagem ${Number(i) + 1}</a><br>`;
        }
      }
    } catch (error) {
      console.log(error);
    }

    let firestoreRef = admin.firestore().collection("mail");
    let emailContent = {
      to: emailSuporte,
      cc: chamado.email,
      replyTo: emailSuporte,
      message: {
        subject: `Abertura de chamado: ${chamado.assunto}`,
        text: "Notificação de abertura de chamado no sistema escolar.",
        html: `
            <h5>Abertura de chamado no sistema escolar</h5>
            <p> 
                <b>Assunto: </b> ${chamado.assunto}
            </p>
            <p> 
                <b>Descrição: </b> ${chamado.descricao}
            </p>
            <p> 
                <b>Usuário solicitante: </b> ${chamado.nome}
            </p>
            <p> 
                <b>Contato do solicitante: </b> ${chamado.email}
            </p>
            <p> 
                <b>Nível de prioridade: </b> ${priorities[chamado.prioridade]}
            </p>
            <p> 
                <b>Data e Hora de Abertura: </b> ${convertTimestamp(
          chamado.timestamp
        ).toLocaleDateString("pt-br", {
          timeZone: "America/Sao_Paulo"
        })} ás ${convertTimestamp(chamado.timestamp).toLocaleTimeString("pt-BR", {
          timeZone: "America/Sao_Paulo"
        })}
            </p>
            <p><b>Imagens anexadas à solicitação: </b><br>${imagens}</p>
            <br>
            <p>Este é um e-mail gerado automaticamente pelo sistema. <b>O e-mail é direcionado para a equipe de suporte que fará a análise do chamado, sendo que, o solicitante está em cópia (Cc) nesta mensagem</b>.</p><p>Todo o contato para análise e resolução da solicitação será preferencialmente via e-mail para fins de resguardo legal, tanto por parte do solicitante, quanto por parte da empresa administradora do sistema escolar.</p><br><br><p>Sistemas GrupoProX.</p>`
      }
    };

    await firestoreRef.add(emailContent);
    console.log("Email queued for delivery.");
  });

exports.montaCalendarioGeral = functions.database
  .ref("sistemaEscolar/turmas/{turma}/aulaEvento/")
  .onWrite(async (snapshot, context) => {
    let aulaEvento = snapshot.after.val();
    let source = aulaEvento;
    let calendarioSnapshot = await admin
      .database()
      .ref("sistemaEscolar/infoEscola/calendarioGeral")
      .once("value");
    let calendario = calendarioSnapshot.exists() ? calendarioSnapshot.val() : [source];
    if (calendarioSnapshot.exists()) {
      calendario.push(source);
    }

    await admin.database().ref("sistemaEscolar/infoEscola/calendarioGeral").set(calendario);
  });

exports.removeCalendarios = functions.database
  .ref("sistemaEscolar/turmas/{turma}/aulaEvento/")
  .onDelete(async (snapshot, context) => {
    let turma = context.params.turma;
    let calendarioSnapshot = await admin
      .database()
      .ref("sistemaEscolar/infoEscola/calendarioGeral")
      .once("value");
    let calendarioGeral = calendarioSnapshot.val();
    let calendario = calendarioGeral.filter((source) => source.id !== turma);

    await admin.database().ref("sistemaEscolar/infoEscola/calendarioGeral").set(calendario);
  });

exports.geraPix = functions.https.onCall((data) => {
  class BrCode {
    constructor(key, amount, name, reference, keyType, city) {
      this.key = key;
      this.amount = amount;
      this.name = name;
      this.reference = reference;
      this.keyType = keyType;
      this.city = city;
    }

    static formatText(text) {
      return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    formatedName() {
      return this.constructor.formatText(this.name);
    }

    formatedCity() {
      return this.constructor.formatText(this.city);
    }

    formatedAmount() {
      return this.amount.replace(",", ".").replace(" ", "").replace("R$", "");
    }

    formatedReferance() {
      return this.constructor.formatText(this.reference).replace(" ", "");
    }

    formatedKey() {
      let rkey = this.key;
      let ktype = this.keyType.toLowerCase();

      if (ktype === "telefone" || ktype === "cnpj" || ktype === "cpf") {
        rkey = rkey.replace(/\D/g, "");
      }

      if (ktype === "telefone") {
        rkey = "+55" + rkey;
      }

      return rkey;
    }

    generateQrcp() {
      let emvqr = Merchant.buildEMVQR();

      emvqr.setPayloadFormatIndicator("01");
      emvqr.setCountryCode("BR");
      emvqr.setMerchantCategoryCode("0000");
      emvqr.setTransactionCurrency("986");
      const merchantAccountInformation = Merchant.buildMerchantAccountInformation();
      merchantAccountInformation.setGloballyUniqueIdentifier("BR.GOV.BCB.PIX");

      merchantAccountInformation.addPaymentNetworkSpecific("01", this.formatedKey());

      emvqr.addMerchantAccountInformation("26", merchantAccountInformation);

      if (this.name) {
        emvqr.setMerchantName(this.formatedName());
      }

      if (this.city) {
        emvqr.setMerchantCity(this.formatedCity());
      }

      if (this.amount && this.amount !== "") {
        emvqr.setTransactionAmount(this.formatedAmount());
      }

      const additionalDataFieldTemplate = Merchant.buildAdditionalDataFieldTemplate();

      if (this.reference) {
        additionalDataFieldTemplate.setReferenceLabel(this.formatedReferance());
      } else {
        additionalDataFieldTemplate.setReferenceLabel("***");
      }

      emvqr.setAdditionalDataFieldTemplate(additionalDataFieldTemplate);
      let payLoadTEst = emvqr.generatePayload();

      return payLoadTEst;
    }
  }
  async function criaCod() {
    const dadosBasicos = (
      await admin.database().ref("sistemaEscolar/infoEscola/dadosBasicos").once("value")
    ).val();
    const lineCode = new BrCode(
      dadosBasicos.chavePix,
      data.valor,
      dadosBasicos.nomePix,
      data.descricao,
      dadosBasicos.tipoChavePix,
      dadosBasicos.cidadePix
    );
    console.log(lineCode);
    const code = lineCode.generateQrcp();
    console.log(code);
    const QR_CODE_SIZE = 400;
    return QRCode.toDataURL(code, {
      width: QR_CODE_SIZE,
      height: QR_CODE_SIZE
    })
      .then((qrcode) => {
        //console.log(qrcode)
        return qrcode;
      })
      .catch((err) => {
        console.error(err);
      });
  }
  return criaCod();
});

exports.alteracaoDados = functions.database
  .ref("sistemaEscolar/alunos/{matricula}/{key}")
  .onUpdate((snapshot, context) => {
    functions.logger.log(context.params.key);
    functions.logger.log(context.params.matricula);
    functions.logger.log(snapshot.before.val());
    functions.logger.log(snapshot.after.val());
  });

exports.systemUpdate = functions.pubsub
  .schedule("0 2 * * 0")
  .timeZone("America/Sao_Paulo")
  .onRun((context) => {
    // let aniversariantesRef = admin.database().ref('sistemaEscolar/aniversariantes')
    // let alunosRef = admin.database().ref('sistemaEscolar/alunos')
    // let alunosRef = admin.database().ref('sistemaEscolar/alunos')
    const firestoreRef = admin.firestore().collection("mail");

    const now = new Date(context.timestamp);

    const emailContent = {
      to: "gustavo.resende@grupoprox.com",
      message: {
        subject: "Job de domingo realizado",
        text: "Veja o log do job de domingo",
        html: `<h3>Olá!</h3><p>O Job de systemUpdate do Sistema Escolar foi executado.</p><p>Ano base: ${now.getFullYear()}</p><p> Timestamp: ${context.timestamp
          }</p><p> EventId: ${context.eventId}</p><p> EventType: ${context.eventType
          }</p><p>Sistemas ProjetoX.</p>`
      }
    };

    firestoreRef
      .add(emailContent)
      .then(() => {
        console.log("Queued email for delivery");
      })
      .catch((error) => {
        console.error(error);
        throw new Error(error.message);
      });

    return null;
  });

exports.dailyUpdate = functions.pubsub
  .schedule("0 0 * * *")
  .timeZone("America/Sao_Paulo")
  .onRun((context) => {
    // let aniversariantesRef = admin.database().ref('sistemaEscolar/aniversariantes')
    // let alunosRef = admin.database().ref('sistemaEscolar/alunos')
    // let alunosRef = admin.database().ref('sistemaEscolar/alunos')
    const firestoreRef = admin.firestore().collection("mail");

    const now = new Date(context.timestamp);

    const ref = admin.database().ref("sistemaEscolar");

    const updates = async () => {
      let aniversaries = [];
      const studentsSnap = await ref.child("alunos").once("value");
      const allStudents = studentsSnap.val();
      for (const id in allStudents) {
        if (Object.hasOwnProperty.call(allStudents, id)) {
          const student = allStudents[id];
          let timestamp = new Date(student.timestamp._seconds * 1000);
          let birthMonth = student.dataNascimentoAluno.split("-")[1];
          let month = context.timestamp.split("-")[1];
          if (birthMonth === month) {
            aniversaries.push({
              name: student.nomeAluno,
              birthDate: student.dataNascimentoAluno,
              studentSince: timestamp.toLocaleDateString("pt-BR"),
              email: student.emailAluno,
              id: id
            });
          }
        }
      }
      const classes = (await ref.child("turmas").once("value")).numChildren();
      const disabledStudents = (await ref.child("alunosDesativados").once("value")).numChildren();
      const students = studentsSnap.numChildren();
      return {
        students: students,
        classes: classes,
        disabledStudents: disabledStudents,
        aniversaries: aniversaries
      };
    };

    updates()
      .then(async (result) => {
        await ref.child("dadosRapidos").update(result);
        const emailContent = {
          to: "gustavo.resende@grupoprox.com",
          message: {
            subject: "Job diário realizado",
            text: "Veja o log do job diário",
            html: `<h3>Olá!</h3><p>O Job de dailyUpdate do Sistema Escolar foi executado.</p><p> Alunos: ${result.students
              }</p><p> Turmas: ${result.classes}</p><p> Alunos Desativados: ${result.disabledStudents
              }</p><p>Ano base: ${now.getFullYear()}</p><p> Timestamp: ${context.timestamp
              }</p><p> EventId: ${context.eventId}</p><p> EventType: ${context.eventType
              }</p><p>Sistemas ProjetoX.</p>`
          }
        };

        firestoreRef
          .add(emailContent)
          .then(() => {
            console.log("Queued email for delivery");
          })
          .catch((error) => {
            console.error(error);
            throw new Error(error.message);
          });
      })
      .catch((error) => {
        const emailContent = {
          to: "gustavo.resende@grupoprox.com",
          message: {
            subject: "Job diário falhou",
            text: "Veja o log do job diário",
            html: `<h3>Olá!</h3><p>O Job de dailyUpdate do Sistema Escolar foi executado, porém falhou.</p><p>Error message: ${error.message
              }</p><p>Ano base: ${now.getFullYear()}</p><p> Timestamp: ${context.timestamp
              }</p><p> EventId: ${context.eventId}</p><p> EventType: ${context.eventType
              }</p><p>Sistemas ProjetoX.</p>`
          }
        };

        firestoreRef
          .add(emailContent)
          .then(() => {
            console.log("Queued email for delivery");
          })
          .catch((error) => {
            console.error(error);
            throw new Error(error.message);
          });
      });

    return null;
  });

exports.newYear = functions.pubsub
  .schedule("0 2 1 1 *")
  .timeZone("America/Sao_Paulo")
  .onRun((context) => {
    const firestoreRef = admin.firestore().collection("mail");

    const calendarRef = admin.database().ref("sistemaEscolar/infoEscola/calendarioGeral");

    const now = new Date(context.timestamp);

    const getBrazilianHolidays = async (year) => {
      const response = await axios.get(`https://brasilapi.com.br/api/feriados/v1/${year}`);

      const holidays = response.data;
      // const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`)
      // const holidays = await response.json()

      return holidays;
    };

    let holidaySource = {
      events: [],
      id: "Holidays " + now.getFullYear(),
      color: "#0b8043"
    };

    getBrazilianHolidays(now.getFullYear())
      .then((holidays) => {
        holidays.map((holiday) => {
          holidaySource.events.push({
            title: holiday.name,
            start: holiday.date
          });
        });

        calendarRef.transaction(
          (sources) => {
            if (sources) {
              sources.push(holidaySource);
            } else {
              sources = [holidaySource];
            }

            return sources;
          },
          (error) => {
            if (error) {
              console.log(error);
            }
          }
        );
      })
      .catch((error) => console.log(error));

    const emailContent = {
      to: "gustavo.resende@grupoprox.com",
      message: {
        subject: "Job anual realizado",
        text: "Veja o log do job anual",
        html: `<h3>Olá!</h3><p>O Job de newYear do Sistema Escolar foi executado.</p><p>Ano base: ${now.getFullYear()}</p><p> Timestamp: ${context.timestamp
          }</p><p> EventId: ${context.eventId}</p><p> EventType: ${context.eventType
          }</p><p>Sistemas ProjetoX.</p>`
      }
    };

    firestoreRef
      .add(emailContent)
      .then(() => {
        console.log("Queued email for delivery");
      })
      .catch((error) => {
        console.error(error);
        throw new Error(error.message);
      });

    return null;
  });

exports.geraBoletos = functions.https.onCall((data) => {
  const getDaysInMonth = (month, year) => {
    // Here January is 1 based
    //Day 0 is the last day in the previous month
    return new Date(year, month, 0).getDate();
    // Here January is 0 based
    // return new Date(year, month+1, 0).getDate();
  };

  async function gera(matricula, codContrato) {
    let alunoRef = admin.database().ref("sistemaEscolar/alunos/" + matricula + "/");
    let alunosDesativadosRef = admin.database().ref("sistemaEscolar/alunosDesativados");
    let contratoRef = admin
      .database()
      .ref("sistemaEscolar/infoEscola/contratos")
      .child(codContrato);
    let infoEscola = await admin.database().ref("sistemaEscolar/infoEscola").once("value");
    let docsSistemaVal = await admin.database().ref("sistemaEscolar/docsBoletos").once("value");
    let dadosEscola = infoEscola.val();
    console.log(dadosEscola);
    let dadosAluno = await alunoRef.once("value");
    dadosAluno = dadosAluno.exists() ?
      dadosAluno :
      await alunosDesativadosRef.child(matricula + "/dadosAluno").once("value");
    let aluno = dadosAluno.val();
    let contratos = aluno.contratos;
    let data = dadosEscola.contratos[codContrato].contratoConfigurado;
    let plano = dadosEscola.contratos[codContrato].planoOriginal;
    let mesInicio = Number(data["ano-mes"].split("-")[1]);
    let anoInicio = Number(data["ano-mes"].split("-")[0]);
    console.log(codContrato);
    let docsSistema = docsSistemaVal.val();
    let qtdeDocs = 0;
    let numerosDeDoc;

    let timestamp = await admin.firestore.Timestamp.now();
    console.log(timestamp);
    let now = new Date(timestamp._seconds * 1000);
    console.log(now);
    let dataProcessamento = `${Number(now.getDate()) <= 9 ? "0" + now.getDate() : now.getDate()}/${Number(now.getMonth()) + 1 <= 9 ? "0" + (Number(now.getMonth()) + 1) : now.getMonth()
      }/${now.getFullYear()}`;

    for (const key in docsSistema) {
      if (Object.hasOwnProperty.call(docsSistema, key)) {
        qtdeDocs++;
      }
    }
    let pag = 1;
    let bol = 0;

    try {
      let docsBoletosGerados = await contratoRef.child("docsBoletos").once("value");
      numerosDeDoc = docsBoletosGerados.val();
      let continuar = true;

      if (continuar) {
        data.valorDesconto = (Number(data.valorCurso) * (data.descontoPlano / 100)).toFixed(2);
        data.valorAcrescimo = (Number(data.valorCurso) * (data.acrescimoPlano / 100)).toFixed(2);
        data.valorFinal = (
          Number(data.valorCurso) +
          (data.valorAcrescimo - data.valorDesconto)
        ).toFixed(2);
        let saldo = data.valorCurso;
        let saldoAcrescimo = data.valorAcrescimo;
        let saldoDesconto = data.valorDesconto;
        let contadorParcelas = data.numeroParcelas;
        let somaParcelas = 0;
        let valorParcelaGlobal = 0;
        let mesParcela;
        let numDoc = qtdeDocs + 1;
        let numerosDeDoc = [];

        async function addParcela(
          parcelaAtual,
          numDeParcelas,
          vencimento,
          numeroDoc,
          valorDoc,
          descontos,
          acrescimos,
          totalCobrado,
          dataProcessamento
        ) {
          bol++;
          if (bol > 3 && pag >= 1) {
            pag++;
            bol = 0;
          }
          await admin.database().ref("sistemaEscolar").child("docsBoletos").push({
            numeroDoc: numeroDoc,
            valorDoc: valorDoc,
            vencimento: vencimento,
            parcelaAtual: parcelaAtual,
            numDeParcelas: numDeParcelas,
            descontos: descontos,
            acrescimos: acrescimos,
            totalCobrado: totalCobrado,
            dataProcessamento: dataProcessamento,
            informacoes: data.descricaoPlano,
            codContrato: codContrato,
            matricula: matricula
          });
        }

        for (let parcela = 0; parcela < data.numeroParcelas; parcela++) {
          let valorParcela;
          let valorCobrado;
          let acrescimoParcela = 0;
          let descontoParcela = 0;
          numerosDeDoc.push(numDoc);
          if (plano.distribuirAcrescimosEDescontos === "on") {
            if (parcela === 0) {
              valorParcelaGlobal = parseFloat(saldo / contadorParcelas).toFixed(2);
            }
            if (parcela >= plano.quandoAplicar) {
              // parcela === data.quandoAplicar ? saldo = data.valorFinal - somaParcelas : null
              if (parcela === plano.quandoAplicar) {
                valorParcelaGlobal = parseFloat(saldo / contadorParcelas).toFixed(2);
              }

              valorParcela = valorParcelaGlobal;
              acrescimoParcela = (saldoAcrescimo / contadorParcelas).toFixed(2);
              descontoParcela = (saldoDesconto / contadorParcelas).toFixed(2);
              // saldo = (Number(saldo) - valorParcela) - Number(acrescimoParcela - descontoParcela)
            } else {
              valorParcela = valorParcelaGlobal;

              // saldo = saldo - valorParcela
              acrescimoParcela = 0;
              descontoParcela = 0;
            }

            saldoAcrescimo -= acrescimoParcela;
            saldoDesconto -= descontoParcela;

            valorCobrado = (Number(valorParcela) + (acrescimoParcela - descontoParcela)).toFixed(2);
            somaParcelas += Number(valorParcela) + (acrescimoParcela - descontoParcela);
          } else {
            if (parcela === 0) {
              saldo = data.valorFinal;
            }

            valorCobrado = parseFloat(data.valorFinal / data.numeroParcelas).toFixed(2);
            valorParcela = valorCobrado;
            // saldo = saldo - parseFloat(data.valorFinal / data.numeroMaximoParcelasPlano).toFixed(2)
            somaParcelas += Number(parseFloat(data.valorFinal / data.numeroParcelas));
          }
          saldo =
            (parcela >= plano.quandoAplicar ? data.valorFinal : data.valorCurso) - somaParcelas;
          console.log(saldo);
          mesParcela = mesInicio + parcela;
          if (mesInicio + parcela > 12) {
            mesParcela -= 12;
          }
          if (mesParcela === 1 && parcela !== 0) {
            anoInicio++;
          }
          let proximoDiaVencimento =
            dadosEscola.dadosBasicos.proximoDiaVencimento === "true" ? true : false;
          let diaVencimento = data.vencimentoEscolhido;
          let mesVencimento = mesParcela;
          let anoVencimento = anoInicio;
          if (getDaysInMonth(mesParcela, anoInicio) < data.vencimentoEscolhido) {
            if (proximoDiaVencimento) {
              diaVencimento = 1;
              mesVencimento = mesParcela === 12 ? 1 : mesParcela + 1;
              anoVencimento = mesVencimento === 1 && parcela !== 0 ? anoInicio + 1 : anoInicio;
            } else {
              diaVencimento = getDaysInMonth(mesParcela, anoInicio);
            }
          }

          await addParcela(
            parcela + 1,
            data.numeroParcelas,
            `${diaVencimento <= 9 ? "0" + diaVencimento : diaVencimento}/${mesVencimento <= 9 ? "0" + mesVencimento : mesVencimento
            }/${anoVencimento}`,
            numDoc,
            valorParcela,
            descontoParcela,
            acrescimoParcela,
            valorCobrado,
            dataProcessamento
          );
          // addParcela(`Saldo: R$${saldo}`)
          contadorParcelas--;
          numDoc++;
        }

        contratoRef
          .child("docsBoletos")
          .set(numerosDeDoc)
          .then(() => {
            console.log("Docs Cadastrados");
          })
          .catch((error) => {
            console.log("Erro", error.message);
          });
      }
    } catch (error) {
      console.log(error);
    }

    return numerosDeDoc;
  }

  return gera(data.matricula, data.codContrato)
    .then((numerosDeDoc) => {
      return numerosDeDoc;
    })
    .catch((error) => {
      throw new functions.https.HttpsError("unknown", error.message, error);
    });
});

exports.escutaBoletos = functions.database
  .ref("sistemaEscolar/docsBoletos/{docKey}")
  .onCreate((snapshot, context) => {
    console.log(context.params);
    console.log(snapshot.after);
    console.log(context.timestamp);
    const docKey = context.params.docKey;
    const doc = snapshot.val();
    if (doc.status) {
      admin.database().ref("sistemaEscolar/docsBoletos").child(docKey).child("status").set(0);
      console.log(`Doc ${doc.numeroDoc} key ${docKey}. Status setado para 0`);
    }
  });

exports.escutaHistoricoBoletos = functions.database
  .ref("sistemaEscolar/docsBoletos/{docKey}/historico/{histKey}")
  .onCreate((snapshot, context) => {
    /**
     * For the WriteOff, 0 = Pending, 1 = Waiting approval, 2 = Written Off, 3 = Challenge, 4 = Canceled
     * 0 means that the billet has not been paid or has not received a write off. In other words, is pending a write off.
     * 1 means that some user with less privilegies in the system changed the status of the billet, then it needs to be approved by one that has the required privilegies
     * 2 means that the billet have been paid, and the Write Off is approved and effective.
     * 3 means that some user has encountered some inconsistency related to that billet and needs review.
     * 4 means that this billet has been canceled for some reason and will not be charged.
     */
    const billetStatus = [
      "Pendente",
      "Aguardando aprovação",
      "Baixa efetuada",
      "Contestado",
      "Cancelado"
    ];
    const docKey = context.params.docKey;
    const histKey = context.params.histKey;
    const hist = snapshot.val();
    const userRequester = hist.userCreator;

    console.log(hist);

    const start = async () => {
      if (hist.status) {
        const user = await admin.auth().getUser(userRequester);
        const userAccess = user.customClaims;

        if (userAccess.master === true || userAccess.adm === true) {
          await admin
            .database()
            .ref("sistemaEscolar/docsBoletos")
            .child(docKey)
            .child("status")
            .set(hist.status);
          await admin
            .database()
            .ref("sistemaEscolar/docsBoletos")
            .child(docKey)
            .child("historico")
            .child(histKey)
            .child("approver")
            .set(userRequester);
          await admin
            .database()
            .ref("sistemaEscolar/docsBoletos")
            .child(docKey)
            .child("historico")
            .child(histKey)
            .child("comments")
            .push({
              text: `(Comentário automático do sistema) O usuário ${user.displayName} (${user.email
                }) modificou o status deste documento para "${billetStatus[hist.status]}".`,
              timestamp: context.timestamp
            });
          if (hist.paidValue !== undefined && hist.paymentDay !== undefined) {
            await admin
              .database()
              .ref("sistemaEscolar/docsBoletos")
              .child(docKey)
              .child("valorPago")
              .set(hist.paidValue);
            await admin
              .database()
              .ref("sistemaEscolar/docsBoletos")
              .child(docKey)
              .child("dataDePagamento")
              .set(hist.paymentDay);
          }

          await admin.database().ref("sistemaEscolar/billetsNotifications").push({
            title: "Mudança de status no boleto",
            text: "O boleto abaixo teve seu status modificado",
            docKey: docKey,
            histKey: histKey,
            userCreator: userRequester,
            timestamp: context.timestamp
          });
        } else {
          await admin
            .database()
            .ref("sistemaEscolar/docsBoletos")
            .child(docKey)
            .child("status")
            .set(1);

          await admin
            .database()
            .ref("sistemaEscolar/docsBoletos")
            .child(docKey)
            .child("historico")
            .child(histKey)
            .child("comments")
            .push({
              text: `(Comentário automático do sistema) O usuário ${user.displayName} (${user.email
                }) deseja modificar o status deste documento para "${billetStatus[hist.status]
                }" e necessita de aprovação.`,
              timestamp: context.timestamp
            });
          await admin.database().ref("sistemaEscolar/billetsNotifications").push({
            title: "Mudança de status boleto",
            text: "O boleto abaixo teve seu status modificado",
            docKey: docKey,
            histKey: histKey,
            userCreator: userRequester,
            timestamp: context.timestamp
          });
        }
      }
    };

    //admin.database().ref('sistemaEscolar/billetsNotifications').child(docKey).child()
    start();
  });

exports.escutaContratos = functions.database
  .ref("sistemaEscolar/infoEscola/contratos/{key}")
  .onCreate((snapshot, context) => {
    const setContract = async () => {
      const key = context.params.key;
      const studentId = snapshot.child("matricula").val();
      console.log(studentId);
      await admin
        .database()
        .ref("sistemaEscolar/infoEscola/contratos")
        .child(key)
        .child("status")
        .set(0);
      await admin
        .database()
        .ref("sistemaEscolar/infoEscola/contratos")
        .child(key)
        .child("timestamp")
        .set(admin.firestore.Timestamp.now());
      const snap = await admin
        .database()
        .ref("sistemaEscolar/alunos")
        .child(studentId)
        .child("contratos")
        .once("value");
      if (snap.exists()) {
        let contracts = snap.val();

        let message;
        if (contracts.indexOf(key) === -1) {
          contracts.push(key);
          await admin
            .database()
            .ref("sistemaEscolar/alunos")
            .child(studentId)
            .child("contratos")
            .set(contracts);
          message = " e eu coloquei mais um";
        }
        return "Já tinha contrato no aluno" + message;
      }
      await admin
        .database()
        .ref("sistemaEscolar/alunos")
        .child(studentId)
        .child("contratos")
        .set([key]);
      return "Estava sem nada no aluno";
    };

    return setContract().then((result) => {
      console.log("Deu certo.", result);
      return "Deu certo";
    });
  });

exports.lancaFaltas = functions.https.onCall((data) => {
  // const data = {dateStr: dateStr, classId: classId, studentsIds: studentsIds}
  const classId = data.classId;
  const studentsIds = data.studentsIds;
  const dateStr = data.dateStr;
  let studentsObj = {};
  for (const i in studentsIds) {
    if (Object.hasOwnProperty.call(studentsIds, i)) {
      const id = studentsIds[i];
      studentsObj[id] = id;
    }
  }

  const release = async () => {
    const classRef = admin.database().ref("sistemaEscolar/turmas/" + classId);
    const checkStr = await classRef.child("frequencia").child(dateStr).once("value");
    if (checkStr.exists()) {
      throw new Error(
        "Já existem faltas lançadas para este dia. Para lançar faltas novamente, apague as faltas já lançadas."
      );
    } else {
      await classRef.child("frequencia").child(dateStr).set(studentsObj);
      for (const i in studentsIds) {
        if (Object.hasOwnProperty.call(studentsIds, i)) {
          const id = studentsIds[i];
          await classRef
            .child("alunos")
            .child(id)
            .child("frequencia")
            .child(dateStr)
            .set({
              turma: classId
            });
        }
      }

      return data;
    }
  };

  return release()
    .then((result) => {
      return {
        answer: "Faltas lançadas com sucesso.",
        result: result
      };
    })
    .catch((error) => {
      throw new functions.https.HttpsError("unknown", error.message, error);
    });
});

exports.removeFaltas = functions.https.onCall((data) => {
  // const data = {dateStr: dateStr, classId: classId, studentId: studentId}
  const classId = data.classId;
  const studentId = data.studentId;
  const dateStr = data.dateStr;

  const release = async () => {
    const classRef = admin.database().ref("sistemaEscolar/turmas/" + classId);
    await classRef.child("frequencia").child(dateStr).child(studentId).remove();
    await classRef.child("alunos").child(studentId).child("frequencia").child(dateStr).remove();

    return data;
  };

  return release()
    .then((result) => {
      return {
        answer: "Faltas removidas com sucesso.",
        result: result
      };
    })
    .catch((error) => {
      throw new functions.https.HttpsError("unknown", error.message, error);
    });
});

exports.escutaFollowUp = functions.database
  .ref("sistemaEscolar/followUp/{id}")
  .onCreate((snapshot, context) => {
    const setContract = async () => {
      const key = context.params.id;
      await admin
        .database()
        .ref("sistemaEscolar/followUp")
        .child(key)
        .child("timestamp")
        .set(admin.firestore.Timestamp.now());
    };

    return setContract().then((result) => {
      console.log("Deu certo.", result);
      return "Deu certo";
    });
  });

// exports.adicionaFotoAluno = functions.storage.object().onFinalize(async (object) => {
//     const fileBucket = object.bucket; // The Storage bucket that contains the file.
//     const filePath = object.name; // File path in the bucket.
//     const contentType = object.contentType; // File content type.
//     const metageneration = object.metageneration; // Number of times metadata has been generated. New objects have a value of 1.
//     const metadata = object.metadata; // File metadata.
//     // Exit if this is triggered on a file that is not an image.
//     functions.logger.log(fileBucket)
//     functions.logger.log(filePath);
//     functions.logger.log(path.dirname(filePath));

//     if (!contentType.startsWith('image/') && filePath.indexOf('alunos') === -1) {
//         return functions.logger.log('This is not an image.');

//     }
//     // Get the file name.
//     functions.logger.log("URL: ", url);
//     const fileName = path.basename(filePath);
//     const matricula = path.dirname(filePath).split('/')[2];
//     functions.logger.log(matricula);
//     return admin.database().ref(`sistemaEscolar/alunos/${matricula}/fotoAluno`).set(url).then(() => {
//         functions.logger.log("Foto adicionada com sucesso!");
//         return {
//             answer: 'Foto adicionada com sucesso.'
//         }
//     }).catch(error => {
//         functions.logger.log(error);
//     })

// })

//Functions for chat app

// exports.chatListener = functions.database.instance('chatchat-7d3bc').ref('chats').onCreate(async (snapshot, context) => {

//     const chat = snapshot.val();
//     const chatKey = chat.chatKey;

//     await admin.database('https://chatchat-7d3bc.firebaseio.com/').ref('chats').child(chatKey + '/createdAt').set(context.timestamp)

//     const settingsRef = admin.database('https://chatchat-7d3bc.firebaseio.com/').ref('settings')

//     const settings = (await settingsRef.once('value')).val()

//     if (settings.sendEmail) {
//         const now = new Date(context.timestamp)
//         const emailContent = {
//             to: 'chat@grupoprox.com',
//             cco: settings.emails,
//             message: {
//                 subject: `Novo Chat pendente`,
//                 text: `${chat.name.split(' ')[0]} está esperando ser atendido.`,
//                 html: `<h3>${chat.name.split(' ')[0]} está esperando ser atendido.</h3><p>Informações coletadas já coletadas:</p><p>Nome: ${chat.name}</p><p> Criado em: ${now.toLocaleDateString()}</p><p>Sistemas GrupoProX.</p>`
//             }
//         }

//         const firestoreRef = admin.firestore().collection('mail');
//         firestoreRef.add(emailContent).then(() => {
//             console.log('Queued email for delivery to gustavo@resende.app')
//         }).catch(error => {
//             console.error(error)
//             throw new Error(error.message)
//         })
//     }

// })
