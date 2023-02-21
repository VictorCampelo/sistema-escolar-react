import { Fragment, useEffect, useState } from "react";
import {
  Paper,
  Button,
  createTheme,
  darken,
  lighten,
  Backdrop,
  CircularProgress
} from "@material-ui/core";
import { DataGrid } from "@mui/x-data-grid";
import { LocaleText } from "../../../components/shared/DataGridLocaleText";
import { useConfirmation } from "../../../contexts/ConfirmContext";
import { useSnackbar } from "notistack";
import { makeStyles } from "@material-ui/styles";
import { studentFilesRef } from "../../../services/storageRefs";
import { usersRef } from "../../../services/databaseRefs";

function getThemePaletteMode(palette) {
  return palette.type || palette.mode;
}

const defaultTheme = createTheme();
const useStyles = makeStyles(
  (theme) => {
    const getBackgroundColor = (color) =>
      getThemePaletteMode(theme.palette) === "dark" ? darken(color, 0.6) : lighten(color, 0.6);

    const getHoverBackgroundColor = (color) =>
      getThemePaletteMode(theme.palette) === "dark" ? darken(color, 0.5) : lighten(color, 0.5);

    return {
      root: {
        "& .super-app-theme--Open": {
          backgroundColor: getBackgroundColor(theme.palette.info.main),
          "&:hover": {
            backgroundColor: getHoverBackgroundColor(theme.palette.info.main)
          }
        },
        "& .super-app-theme--Filled": {
          backgroundColor: getBackgroundColor(theme.palette.success.main),
          "&:hover": {
            backgroundColor: getHoverBackgroundColor(theme.palette.success.main)
          }
        },
        "& .super-app-theme--PartiallyFilled": {
          backgroundColor: getBackgroundColor(theme.palette.warning.main),
          "&:hover": {
            backgroundColor: getHoverBackgroundColor(theme.palette.warning.main)
          }
        },
        "& .super-app-theme--true": {
          backgroundColor: getBackgroundColor(theme.palette.error.main),
          "&:hover": {
            backgroundColor: getHoverBackgroundColor(theme.palette.error.main)
          }
        }
      },
      backdrop: {
        zIndex: theme.zIndex.drawer + 1,
        color: "#fff"
      }
    };
  },
  { defaultTheme }
);

const ExternalFilesUpload = ({ hasFile }) => {
  const S = useStyles();

  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [studentKey, setStudentKey] = useState();

  useEffect(() => {
    if (!studentKey) {
      let sessionKey = sessionStorage.getItem("studentKey");

      if (sessionKey) {
        setStudentKey(sessionKey);
      } else {
        const key = usersRef.push().key;
        setStudentKey(key);
        sessionStorage.setItem("studentKey", JSON.stringify(key));
      }
    }
  }, [studentKey]);

  const confirm = useConfirmation();

  const handleRowEdit = async (e) => {

    setLoading(true);

    try {
      await confirm({
        variant: "danger",
        catchOnCancel: true,
        title: "Confirmação",
        description: "Cuidado. Você está editando o acesso MASTER do usuário. Deseja alterar o acesso MASTER deste usuário?"
      });

      enqueueSnackbar("", {
        title: "Sucesso",
        variant: "success",
        key: "0",
        action:
          <Button onClick={() => closeSnackbar("0")} color="inherit">
            Fechar
          </Button>

      });
    } catch (error) {
      console.error(error);
      error &&
        enqueueSnackbar(error.message, {
          title: "Erro",
          variant: "error",
          key: "0",
          action:
            <Button onClick={() => closeSnackbar("0")} color="inherit">
              Fechar
            </Button>

        });
    }
    setLoading(false);
  };


  const handleRowClick = async (e) => {

  };

  const handleFiles = async (filesInp) => {
    let localFiles = [];
    let localArray = [];
    for (const i in files) {
      if (Object.hasOwnProperty.call(files, i)) {
        const file = files[i];
        localFiles.push(file);
      }
    }

    for (const i in filesInp) {
      if (Object.hasOwnProperty.call(filesInp, i)) {
        const file = filesInp[i];
        localArray.push(file);
      }
    }

    try {
      setLoading(true);
      let oneProg = (100 / filesInp.length).toFixed(0);
      let prog = 0;
      await confirm({
        variant: "danger",
        catchOnCancel: true,
        title: "Confirmação",
        description: `Após enviado, você não conseguirá deletar o arquivo por questões de segurança. Caso necessite, entre em contato com a escola para deletar os arquivos. Você deseja fazer o upload desses arquivos?${localArray.map(
          (file) => " " + file.name
        )}`
      });

      for (const id in filesInp) {
        if (Object.hasOwnProperty.call(filesInp, id)) {
          const file = filesInp[id];
          let localFile = file;
          localFile.id = Number(id) + Number(files.length);
          localFiles.push(localFile);
          setProgress(prog);

          await studentFilesRef.child(studentKey).child(file.name).put(file);
          //const link = await usersRef.child(user.uid).child('profilePic').getDownloadURL();
          prog += oneProg;
          setFiles([...localFiles]);
        }
      }

      hasFile(true);
      sessionStorage.setItem(2, JSON.stringify(studentKey));
      enqueueSnackbar("Arquivos salvos.", {
        title: "Sucesso",
        variant: "success",
        key: "0",
        action:
          <Button onClick={() => closeSnackbar("0")} color="inherit">
            Fechar
          </Button>

      });
    } catch (error) {
      error &&
        enqueueSnackbar(error.message, {
          title: "Erro",
          variant: "error",
          key: "0",
          action:
            <Button onClick={() => closeSnackbar("0")} color="inherit">
              Fechar
            </Button>

        });
      console.error(error);
    }
    setLoading(false);
  };

  return (
    <>
      <div style={{ position: "absolute" }}>
        <Backdrop className={S.backdrop} open={loading}>
          <CircularProgress color="inherit" variant="determinate" value={progress} />
        </Backdrop>
      </div>
      <input
        type="file"
        style={{ display: "none" }}
        id="filePicker"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Fragment>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={() => document.getElementById("filePicker").click()}
        >
          Adicionar arquivos...
        </Button>
        <Paper variant="outlined" style={{ height: "60vh" }}>
          <div style={{ height: "100%", width: "100%" }} className={S.root}>
            <DataGrid
              rows={files}
              columns={[
                { field: "name", headerName: "Nome", width: 300, resizable: true },
                { field: "type", headerName: "Tipo", width: 300, resizable: true }
              ]}
              disableSelectionOnClick
              onCellEditCommit={handleRowEdit}
              loading={loading}
              localeText={LocaleText}
              onRowClick={handleRowClick}
              getRowClassName={(params) => {

                return `super-app-theme--${params.getValue(params.id, "disabled")}`;
              }}
            />
          </div>
        </Paper>
      </Fragment>
    </>
  );
};

export default ExternalFilesUpload;
