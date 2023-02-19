import { Button, Grid } from "@material-ui/core";
import { PlusOneRounded } from "@material-ui/icons";
import { DataGrid, GridToolbarContainer, GridToolbarExport } from "@mui/x-data-grid";
import { Fragment, useEffect, useState } from "react";
import { LocaleText } from "../../../../../components/shared/DataGridLocaleText";
import { headquartersRef } from "../../../../../services/databaseRefs";

const SchoolCourses = () => {
  const [loading, setLoading] = useState(false);

  function CustomToolbar() {
    return (
      <GridToolbarContainer>
        <GridToolbarExport csvOptions={{ fileName: "Tabela das sedes da escola" }} />
      </GridToolbarContainer>
    );
  }

  const [rows, setRows] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);

  useEffect(() => {
    async function getAdditionalFields() {
      setLoading(true);
      let snapshot = await headquartersRef.once("value");
      setLoading(false);
      let additionalFields = snapshot.exists() ? snapshot.val() : [];
      setRows(additionalFields);
    }
    getAdditionalFields();
  }, []);

  const handleAddRow = () => {
    let rowsArray = JSON.parse(JSON.stringify(rows));
    rowsArray.push({
      id: rowsArray.length,
      codSistema: rowsArray.length,
      codSede: "Nome da sede",
      nomeSede: "Digite..."
    });
    setRows(rowsArray);
    console.log(rowsArray);
  };

  const handleRowEdit = async (editedRow) => {
    setLoading(true);
    console.log(editedRow);
    let rowsArray = JSON.parse(JSON.stringify(rows));
    let rowIndex = rowsArray.findIndex((row) => row.id === editedRow.id);
    rowsArray[rowIndex][editedRow.field] = editedRow.value;
    setRows(rowsArray);
    console.log(rowsArray);
    try {
      await headquartersRef.set(rowsArray);
      setLoading(false);
    } catch (error) {
      console.log(error);
      setLoading(false);
      throw new Error(error.message);
    }
  };

  const handleRowSelection = (selectedRows) => {
    setSelectedRows(selectedRows);
  };

  const handleDeleteRows = async () => {
    setLoading(true);
    let rowsArray = JSON.parse(JSON.stringify(rows));
    let updatedRows = rowsArray.filter((row) => selectedRows.indexOf(row.id) === -1);
    console.log(updatedRows);

    try {
      await headquartersRef.set(updatedRows);
      setRows(updatedRows);
      setLoading(false);
    } catch (error) {
      console.log(error);
      setLoading(false);
      throw new Error(error.message);
    }
  };

  return (
    <Fragment>
      <Grid justifyContent="flex-start" container direction="row" spacing={2}>
        <Grid item>
          <h3>Sedes cadastradas</h3>
        </Grid>

        <Grid item xs={12}>
          <div style={{ height: 300, width: "100%" }}>
            <DataGrid
              rows={rows}
              columns={[
                {
                  field: "codSistema",
                  headerName: "ID",
                  description:
                    "Código apenas para identificação interna no sistema. Não aparecerá em outros documentos do sistema.",
                  width: 92,
                  editable: false
                },
                {
                  field: "codSede",
                  headerName: "Código",
                  description:
                    "O código do curso será utilizado para formar o código automático da turma.",
                  width: 130,
                  editable: true
                },
                {
                  field: "nomeSede",
                  headerName: "Nome da sede",
                  description: "Este será o nome que aparecerá nos boletins.",
                  width: 300,
                  editable: true
                }
              ]}
              disableSelectionOnClick
              checkboxSelection
              components={{
                Toolbar: CustomToolbar
              }}
              onCellEditCommit={handleRowEdit}
              loading={loading}
              localeText={LocaleText}
              onSelectionModelChange={handleRowSelection}
            />
          </div>
        </Grid>
        <Grid item>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              handleAddRow();
            }}
          >
            <PlusOneRounded />
            Nova Sede
          </Button>
        </Grid>
        <Grid item>
          {selectedRows.length > 0 &&
            <Button
              variant="contained"
              color="secondary"
              onClick={() => {
                handleDeleteRows();
              }}
            >
              Excluir sede
            </Button>
          }
        </Grid>
      </Grid>
    </Fragment>
  );
};

export default SchoolCourses;
