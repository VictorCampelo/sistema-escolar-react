import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  makeStyles,
  Paper,
  Typography
} from "@material-ui/core";
import { ExpandMore } from "@material-ui/icons";
import { Fragment, useState } from "react";
import AdditionalFieldsSetting from "./components/AdditionalFieldsSettings";
import BasicSchoolData from "./components/BasicSchoolData";
import DaysCodeSet from "./components/DaysCodesSet";
import SchoolBooks from "./components/SchoolBooks";
import SchoolCourses from "./components/SchoolCourses";
import SchoolHeadquarters from "./components/schoolHeadQuarters";

const useStyles = makeStyles((theme) => ({
  paper: {
    padding: "10px",
    minWidth: "250px",
    marginBottom: "7px"
  },
  root: {
    width: "100%"
  },
  heading: {
    fontSize: theme.typography.pxToRem(15),
    flexBasis: "33.33%",
    flexShrink: 0
  },
  secondaryHeading: {
    fontSize: theme.typography.pxToRem(15),
    color: theme.palette.text.secondary
  }
}));

const SchoolSettings = () => {
  const S = useStyles();
  const [expanded, setExpanded] = useState(false);

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <Fragment>
      <h2>Configurações da escola</h2>
      <div className={S.root}>
        <Accordion expanded={expanded === "panel1"} onChange={handleChange("panel1")}>
          <AccordionSummary
            expandIcon={<ExpandMore />}
            aria-controls="panel1bh-content"
            id="panel1bh-header"
          >
            <Typography className={S.heading}>Dados Básicos</Typography>
            <Typography className={S.secondaryHeading}>
              Dados básicos como o nome, contatos da escola, e chave pix para carnês
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <BasicSchoolData />
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={expanded === "panel2"} onChange={handleChange("panel2")}>
          <AccordionSummary
            expandIcon={<ExpandMore />}
            aria-controls="panel2bh-content"
            id="panel2bh-header"
          >
            <Typography className={S.heading}>Campos adicionais</Typography>
            <Typography className={S.secondaryHeading}>
              Campos adicionais personalizados que aparecerão no cadastro de alunos
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <AdditionalFieldsSetting />
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={expanded === "panel3"} onChange={handleChange("panel3")}>
          <AccordionSummary
            expandIcon={<ExpandMore />}
            aria-controls="panel3bh-content"
            id="panel3bh-header"
          >
            <Typography className={S.heading}>Cursos Cadastrados</Typography>
            <Typography className={S.secondaryHeading}>
              Cursos cadastrados no sistema que são oferecidos pela escola
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <SchoolCourses />
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={expanded === "panel4"} onChange={handleChange("panel4")}>
          <AccordionSummary
            expandIcon={<ExpandMore />}
            aria-controls="panel3bh-content"
            id="panel3bh-header"
          >
            <Typography className={S.heading}>Sedes Cadastradas</Typography>
            <Typography className={S.secondaryHeading}>
              Sedes da rede escolar
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <SchoolHeadquarters />
          </AccordionDetails>

        </Accordion>

        <Accordion expanded={expanded === "panel5"} onChange={handleChange("panel5")}>
          <AccordionSummary
            expandIcon={<ExpandMore />}
            aria-controls="panel4bh-content"
            id="panel4bh-header"
          >
            <Typography className={S.heading}>Livros Cadastrados</Typography>
            <Typography className={S.secondaryHeading}>
              Livros cadastrados no sistema que são utilizados pela escola.
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <SchoolBooks />
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={expanded === "panel6"} onChange={handleChange("panel6")}>
          <AccordionSummary
            expandIcon={<ExpandMore />}
            aria-controls="panel5bh-content"
            id="panel5bh-header"
          >
            <Typography className={S.heading}>Códigos dos dias da semana</Typography>
            <Typography className={S.secondaryHeading}>
              Códigos dos dias da semana para gerar os códigos de turmas.
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <DaysCodeSet />
          </AccordionDetails>
        </Accordion>
      </div>
    </Fragment>
  );
};

export default SchoolSettings;
