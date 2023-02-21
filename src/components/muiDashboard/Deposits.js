import React, { useEffect, useState } from "react";
import Link from "@material-ui/core/Link";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import Title from "./Title";
import { quickDataRef } from "../../services/databaseRefs";

function preventDefault(event) {
  event.preventDefault();
}

const useStyles = makeStyles({
  depositContext: {
    flex: 1
  }
});

export default function Deposits() {
  const S = useStyles();

  const [data, setData] = useState({});

  useEffect(() => {
    quickDataRef
      .once("value")
      .then((snapshot) => {
        setData(snapshot.val());
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

  return (
    <React.Fragment>
      <Title>Dados rápidos</Title>
      {data && (
        <div>
          <Typography variant="h6">
            {data.students}
          </Typography>
          <Typography color="textSecondary" className={S.depositContext}>
            alunos ativos
          </Typography>
          <Typography variant="h6">
            {data.classes}
          </Typography>
          <Typography color="textSecondary" className={S.depositContext}>
            turmas criadas
          </Typography>
          <Typography variant="h6">
            {data.disabledStudents}
          </Typography>
          <Typography color="textSecondary" className={S.depositContext}>
            alunos desativados
          </Typography>
        </div>
      )}
    </React.Fragment>
  );
}
