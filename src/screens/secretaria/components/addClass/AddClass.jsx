import {
  Avatar,
  Backdrop,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Fab,
  FormControl,
  Grid,
  Input,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography
} from "@material-ui/core";
import { Add, Assistant, LibraryBooks } from "@material-ui/icons";
import { DataGrid, GridToolbarContainer } from "@mui/x-data-grid";
import { useSnackbar } from "notistack";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  booksRef,
  coursesRef,
  daysCodesRef,
  headquartersRef,
  teachersListRef
} from "../../../../services/databaseRefs";
import { LocaleText } from "../../../../components/shared/DataGridLocaleText";
import { generateClassCode, handleSendClassData } from "../../../../components/shared/FunctionsUse";
import { useStyles } from "./styles";

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250
    }
  }
};

const AddClass = ({ dataForEditing, onClose }) => {
  const tableRef = useRef();

  function CustomToolbar() {
    return (
      <GridToolbarContainer>
        <label htmlFor={"selectBook"}>Escolha os livros *</label>
        {/* <GridToolbarExport csvOptions={{fileName: 'Tabela de livros cadastrados'}} /> */}
      </GridToolbarContainer>
    );
  }

  const S = useStyles();

  const { enqueueSnackbar } = useSnackbar();

  const [loader, setLoader] = useState(false); // Loader state for the class submit
  const [loading, setLoading] = useState(false); // Loading state for the data grid of the books
  const [rows, setRows] = useState([]);
  const [classData, setClassData] = useState({
    codigoSala: "",
    curso: "",
    cursoName: "",
    escola: "",
    escolaName: "",
    diasDaSemana: [],
    hora: "",
    horarioTerminoTurma: "",
    livros: [],
    modalidade: "",
    professor: "",
    professorName: ""
  });
  const [courses, setCourses] = useState([]);
  const [headquarters, setHeadquarters] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [days, setDays] = useState([]);
  const fabStyle = {
    margin: 0,
    top: "auto",
    right: 20,
    bottom: 20,
    left: "auto",
    position: "fixed"
  };

  async function getBooks() {
    setLoading(true);
    let snapshot = await booksRef.once("value");
    let books = snapshot.exists() ? snapshot.val() : [];
    setRows(books);
    setLoading(false);
  }

  const getDays = async () => {
    const allDays = (await daysCodesRef.once("value")).val();

    console.log(allDays);

    if (allDays) {
      setDays(allDays);
    }
  };

  const getCourses = async () => {
    const allCourses = (await coursesRef.once("value")).val();
    setCourses(allCourses);
  };

  const getHeadquarters = async () => {
    const allHeadquarters = (await headquartersRef.once("value")).val();
    setHeadquarters(allHeadquarters);
  };

  const getTeachers = async () => {
    const allTeachers = (await teachersListRef.once("value")).val();
    let teachersArray = [];
    for (const uid in allTeachers) {
      if (Object.hasOwnProperty.call(allTeachers, uid)) {
        const teacher = allTeachers[uid];
        teachersArray.push(teacher);
      }
    }
    allTeachers ? setTeachers([...teachersArray]) : setTeachers();
  };

  const setInitalDataForEditing = () => {
    if (dataForEditing) {
      setClassData(dataForEditing);
    }
  };

  useEffect(() => {
    getCourses();
    getHeadquarters();
    getTeachers();
    getDays();
    getBooks();
    setInitalDataForEditing();
  }, []);

  const handleFormChange = async (e) => {
    try {
      const value = e.target.value;
      const id = e.target.id;
      let data = { ...classData };
      data[id] = value;

      if (id !== "codigoSala") {
        const classCode = await generateClassCode(data);
        data.codigoSala = classCode;
      }

      setClassData(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDayPicker = async (e) => {
    try {
      const value = e.target.value;

      let data = { ...classData };

      data.diasDaSemana = value;

      const classCode = await generateClassCode(data);

      data.codigoSala = classCode;

      setClassData(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleRowSelection = async (selectedRows) => {
    try {
      let data = { ...classData };
      data.livros = selectedRows;
      const classCode = await generateClassCode(data);
      data.codigoSala = classCode;
      setClassData(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async () => {
    setLoader(true);
    try {
      let message = await handleSendClassData(classData);
      setLoader(false);
      enqueueSnackbar(message.answer, { variant: "success" });
      if (dataForEditing) {
        onClose();
      }
    } catch (error) {
      console.error(error);
      setLoader(false);
      enqueueSnackbar(error.message, { variant: "error" });
    }
  };

  return (
    <Fragment>
      <div style={{ position: "absolute" }}>
        <Backdrop className={S.backdrop} open={loader}>
          <CircularProgress color="inherit" />
        </Backdrop>
      </div>
      <div className={S.container}>
        <Card className={S.smallCards} variant="outlined">
          <CardContent>
            <Grid justifyContent="flex-start" direction="row" container spacing={1}>
              <Grid item>
                <Avatar className={S.avatar}>
                  <Assistant />
                </Avatar>
              </Grid>

              <Grid item>
                <Typography variant="h5" component="h2">
                  Dados da turma
                </Typography>
              </Grid>
            </Grid>

            <hr />

            <form id="formClassData" onChange={handleFormChange} autoComplete="off">
              <Box m={1} className={S.fieldsContainer}>
                <TextField
                  id="codigoSala"
                  label="Código da turma"
                  variant="filled"
                  value={classData.codigoSala}
                  className={S.textField}
                  required
                />
                <TextField
                  id="hora"
                  type="time"
                  label="Hr. Início"
                  value={classData.hora}
                  className={S.textField}
                  helperText=""
                  variant="filled"
                  InputLabelProps={{
                    shrink: true
                  }}
                  required
                />
                <TextField
                  id="horarioTerminoTurma"
                  type="time"
                  label="Hr. Término"
                  value={classData.horarioTerminoTurma}
                  className={S.textField}
                  helperText=""
                  variant="filled"
                  InputLabelProps={{
                    shrink: true
                  }}
                  required
                />
              </Box>

              <Box m={1}>
                {courses ? (
                  <TextField
                    id="curso"
                    select
                    label="Curso"
                    value={classData.curso}
                    fullWidth
                    helperText="Escolha o curso desta turma"
                    variant="filled"
                    SelectProps={{
                      native: true
                    }}
                    required>
                    <option hidden selected>
                      Escolha um curso...
                    </option>

                    {courses.length > 0 &&
                      courses.map((option) => (
                        <option key={option.codSistema} value={option.codSistema}>
                          {option.codCurso + " - " + option.nomeCurso}
                        </option>
                      ))}
                  </TextField>
                ) : (
                  <label htmlFor={courses.length} style={{ color: "red" }}>
                    Nenhum curso cadastrado no sistema
                  </label>
                )}
              </Box>

              <Box m={1}>
                {teachers ? (
                  <TextField
                    id="professor"
                    select
                    label="Professor(a) Referência"
                    value={classData.professor}
                    fullWidth
                    helperText="Escolha um professor para esta turma"
                    variant="filled"
                    SelectProps={{
                      native: true
                    }}
                    required>
                    <option hidden selected>
                      Escolha um(a) professor(a)...
                    </option>

                    {teachers.length > 0 &&
                      teachers.map((teacher, i) => (
                        <option key={i} value={teacher.emailProfessor}>
                          {`${teacher.nomeProfessor} (${teacher.emailProfessor})`}
                        </option>
                      ))}
                  </TextField>
                ) : (
                  <label htmlFor={teachers.length} style={{ color: "red" }}>
                    Nenhum professor cadastrado no sistema
                  </label>
                )}
              </Box>

              <Box m={1}>
                <TextField
                  id="modalidade"
                  select
                  label="Modalidade"
                  value={classData.modalidade}
                  fullWidth
                  helperText="Escolha a modaldiade desta turma"
                  variant="filled"
                  SelectProps={{
                    native: true
                  }}
                  required>
                  <option hidden selected>
                    Escolha uma modalidade...
                  </option>
                  <option value="presencial">Presencial</option>
                  <option value="ead">Ensino à Distância (EaD)</option>
                </TextField>
              </Box>

              <Box m={1}>
                <TextField
                  id="escola"
                  select
                  label="Escola"
                  value={classData.escola}
                  fullWidth
                  helperText="Escolha a sede dessa turma"
                  variant="filled"
                  SelectProps={{
                    native: true
                  }}
                  required>
                  <option hidden selected>
                    Selecione uma escola...
                  </option>
                  {headquarters.length > 0 &&
                    headquarters.map((option) => (
                      <option key={option.internalCod} value={option.internalCod}>
                        {option.cod + " - " + option.name}
                      </option>
                    ))}
                </TextField>
              </Box>
            </form>
          </CardContent>
        </Card>
        <Card className={S.bigCards} variant="outlined">
          <CardContent>
            <Grid justifyContent="flex-start" direction="row" container spacing={1}>
              <Grid item>
                <Avatar className={S.avatar}>
                  <LibraryBooks />
                </Avatar>
              </Grid>

              <Grid item>
                <Typography variant="h5" component="h2">
                  Dias da semana e Materiais
                </Typography>
              </Grid>
            </Grid>
            <hr />
            <Box m={1}>
              {days ? (
                <FormControl className={S.formControl}>
                  <InputLabel id="demo-mutiple-chip-label">Dias da semana</InputLabel>
                  <Select
                    labelId="demo-mutiple-chip-label"
                    id="diasDaSemana"
                    multiple
                    fullWidth
                    value={classData.diasDaSemana}
                    variant="filled"
                    onChange={handleDayPicker}
                    input={<Input id="diasDaSemana" />}
                    renderValue={(selected) => (
                      <div className={S.chips}>
                        {selected.map((value) => (
                          <Chip key={value} label={days[value]} className={S.chip} />
                        ))}
                      </div>
                    )}
                    MenuProps={MenuProps}>
                    {days.map((name, i) => (
                      <MenuItem key={name} name="diasDaSemana" value={i}>
                        {name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <label htmlFor={days.length} style={{ color: "red" }}>
                  Códigos de dias da semana não configurados no sistema
                </label>
              )}
            </Box>
            <Box m={1}>
              <div style={{ height: 250, width: "100%" }}>
                <DataGrid
                  ref={tableRef}
                  style={{ width: "100%" }}
                  rows={rows}
                  columns={[
                    { field: "codSistema", headerName: "ID", width: 92, editable: false },
                    { field: "codLivro", headerName: "Código", width: 130, editable: false },
                    {
                      field: "nomeLivro",
                      headerName: "Nome do Livro",
                      width: 300,
                      editable: false
                    },
                    { field: "idLivro", headerName: "Ident. do Livro", width: 300, editable: false }
                  ]}
                  disableSelectionOnClick
                  checkboxSelection
                  components={{
                    Toolbar: CustomToolbar
                  }}
                  loading={loading}
                  localeText={LocaleText}
                  onSelectionModelChange={handleRowSelection}
                />
              </div>
            </Box>
          </CardContent>
        </Card>
      </div>
      <div>
        <Fab
          onClick={handleSubmit}
          disabled={!courses || !teachers || !rows || !days}
          style={fabStyle}
          variant="extended"
          color="primary">
          <Add className={S.extendedIcon} />
          Cadastrar turma
        </Fab>
      </div>
    </Fragment>
  );
};

export default AddClass;
