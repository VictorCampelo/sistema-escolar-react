import React from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from "@material-ui/core";
import Button from "@material-ui/core/Button";

export function DialogComponent({
  fullScreen,
  openFinalDialog,
  setOpenFinalDialog,
  handleSendData
}) {
  return (
    <Dialog
      fullScreen={fullScreen}
      open={openFinalDialog}
      onClose={() => setOpenFinalDialog(false)}
      aria-labelledby="responsive-dialog-title"
      ba>
      <DialogTitle id="responsive-dialog-title">
        {"Você confirma o cadastro do Professor?"}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          Todos os dados digitados serão enviados aos servidores, e você será identificado como
          usuário que realizou este cadastro para consultas futuras.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpenFinalDialog(false)} color="primary">
          Cancelar
        </Button>
        <Button onClick={handleSendData} color="primary">
          Cadastrar Professor
        </Button>
      </DialogActions>
    </Dialog>
  );
}

