import { useState, Fragment, useRef } from "react";
import {
  TextField,
  Button, Typography, CircularProgress
} from "@material-ui/core";
import FormDialog from "../../components/shared/FormDialog";

import { useAuth } from "../../hooks/useAuth";
import SimpleSnackbar from "../../components/shared/Snackbar";

const SignUpDialog = (props) => {
  const { onClose } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(true);
  const [status, setStatus] = useState(null);
  const [showSnack, setShowSnack] = useState(false);

  const { passwordRecover, createUserWithEmailAndPassword } = useAuth();

  const loginName = useRef();
  const loginEmail = useRef();
  const loginPassword = useRef();
  const loginPasswordConfirm = useRef();

  const handlePasswordForgot = async () => {
    if (loginEmail.current.value !== "") {
      try {
        await passwordRecover(loginEmail.current.value);
        setShowSnack(true);
      } catch (error) {
        console.error(error);
        setStatus(error.code);
      }
    } else {
      setStatus("auth/user-not-found");
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const signUp = async () => {
    setIsLoading(true);
    let name = loginName.current.value;
    let email = loginEmail.current.value;
    let password = loginPassword.current.value;
    let confirmPassword = loginPasswordConfirm.current.value;

    if (password === confirmPassword) {
      try {
        let user = await createUserWithEmailAndPassword(email, password, name);
        console.log(user);

        if (user) {
          setOpen(false);
          setIsLoading(false);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error(error);
        setStatus(error.code);
        setIsLoading(false);
      }
    } else {
      setStatus("passwordsDoNotMatch");
      setIsLoading(false);
    }
  };

  return (
    <Fragment>
      {showSnack ?
        <SimpleSnackbar
          duration={10000}
          message={"Um e-mail foi enviado para você com um link para recuperação."}
          closeButtonLabel={"Ok"}
          isOpen={true}
          onClose={setShowSnack(false)}
        />
       :
        ""
      }

      <FormDialog
        open={open}
        onClose={onClose}
        loading={isLoading}
        handleClose={handleClose}
        closeButton={true}
        onFormSubmit={(e) => {
          console.log("entrou");
          e.preventDefault();
          signUp();
        }}
        headline="Criar conta"
        content={
          <Fragment>
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              label="Nome e Sobrenome"
              inputRef={loginName}
              
              autoComplete="off"
              type="text"
            />

            <TextField
              variant="outlined"
              margin="normal"
              error={status === "auth/user-not-found"}
              required
              fullWidth
              label="E-mail"
              inputRef={loginEmail}
              
              autoComplete="off"
              type="email"
              onChange={() => {
                if (status === "auth/user-not-found") {
                  setStatus(null);
                }
              }}
              helperText={status === "auth/user-not-found" && "Verifique o endereço de e-mail."}
              FormHelperTextProps={{ error: true }}
            />

            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              error={status === "auth/wrong-password"}
              label="Senha"
              type="password"
              inputRef={loginPassword}
              autoComplete="off"
              onChange={() => {
                if (status === "auth/wrong-password") {
                  setStatus(null);
                }
              }}
              helperText={
                status === "auth/wrong-password" ?
                  <span>
                    Senha incorreta. Tente novamente ou clique em{" "}
                    <b>&quot;Esqueçeu sua senha?&quot;</b> para redefini-la.
                  </span>
                 :
                  ""

              }
            />

            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              error={status === "passwordsDoNotMatch"}
              label="Confirme a Senha"
              type="password"
              inputRef={loginPasswordConfirm}
              autoComplete="off"
              onChange={() => {
                if (status === "passwordsDoNotMatch") {
                  setStatus(null);
                }
              }}
              helperText={
                status === "passwordsDoNotMatch" ?
                  <span>
                    <b>Senhas não conferem</b>
                  </span>
                 :
                  ""

              }
            />
          </Fragment>
        }
        actions={
          <Fragment>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="secondary"
              disabled={isLoading}
              size="large"
            >
              Criar conta
              {isLoading && <CircularProgress />}
            </Button>
            <Typography
              align="center"
              style={{
                cursor: "pointer"
              }}
              color="primary"
              onClick={isLoading ? null : handlePasswordForgot}
              tabIndex={0}
              role="button"
              onKeyDown={(event) => {
                // For screenreaders listen to space and enter events
                if (!isLoading && event.keyCode === 13 || event.keyCode === 32) {
                  handlePasswordForgot();
                }
              }}
            >
              Esqueceu sua senha?
            </Typography>
          </Fragment>
        }
      />
    </Fragment>
  );
};

export default SignUpDialog;
