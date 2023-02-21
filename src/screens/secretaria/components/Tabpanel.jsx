import AppBar from "@material-ui/core/AppBar";
import Box from "@material-ui/core/Box";
import { makeStyles } from "@material-ui/core/styles";
import Tab from "@material-ui/core/Tab";
import Tabs from "@material-ui/core/Tabs";
import Typography from "@material-ui/core/Typography";
import {
  AddBox,
  AssignmentInd,
  Build,
  GroupWork,
  Home,
  PeopleAlt,
  PersonAdd
} from "@material-ui/icons";
import PropTypes from "prop-types";
import React from "react";
import "../../../app/App.css";
import Dashboard from "../../../components/muiDashboard/Dashboard";
import AddClass from "./addClass/AddClass";
import AddStudent from "./addStudent/AddStudent";
import AddTeacher from "./addTeacher/AddTeacher";
import Classes from "./classes/Classes";
import PreEnrollments from "./preMatriculas/PreEnrollments";
import SchoolSettings from "./schoolSettings/SchoolSettings";
import Students from "./students/Students";

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`scrollable-force-tabpanel-${index}`}
      aria-labelledby={`scrollable-force-tab-${index}`}
      {...other}>
      {value === index && <Box p={3}>{children}</Box>}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.any.isRequired,
  value: PropTypes.any.isRequired
};

function a11yProps(index) {
  return {
    id: `scrollable-force-tab-${index}`,
    "aria-controls": `scrollable-force-tabpanel-${index}`
  };
}

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
    width: "100%",
    backgroundColor: theme.palette.background.paper
  }
}));

export default function SecretariaTabs() {
  const S = useStyles();
  const [value, setValue] = React.useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <div className={S.root}>
      <AppBar position="sticky" color="default">
        <Tabs
          value={value}
          onChange={handleChange}
          variant="scrollable"
          scrollButtons="on"
          indicatorColor="primary"
          textColor="primary"
          aria-label="scrollable force tabs example">
          <Tab label="Dashboard" icon={<Home />} {...a11yProps(0)} />
          <Tab label="Alunos" icon={<PeopleAlt />} {...a11yProps(1)} />
          <Tab label="Turmas" icon={<GroupWork />} {...a11yProps(2)} />
          <Tab label="Novo Aluno" icon={<PersonAdd />} {...a11yProps(3)} />
          <Tab label="Nova Turma" icon={<AddBox />} {...a11yProps(4)} />
          <Tab label="Novo Professor" icon={<AddBox />} {...a11yProps(5)} />
          <Tab label="Pré-Matrículas" icon={<AssignmentInd />} {...a11yProps(6)} />
          <Tab label="Conf. da Escola" icon={<Build />} {...a11yProps(7)} />
        </Tabs>
      </AppBar>

      <TabPanel value={value} index={0}>
        <Dashboard />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <Students />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <Classes />
      </TabPanel>
      <TabPanel value={value} index={3}>
        <AddStudent />
      </TabPanel>
      <TabPanel value={value} index={4}>
        <AddClass />
      </TabPanel>
      <TabPanel value={value} index={5}>
        <AddTeacher />
      </TabPanel>
      <TabPanel value={value} index={6}>
        <PreEnrollments changeTab={handleChange} />
      </TabPanel>
      <TabPanel value={value} index={7}>
        <SchoolSettings />
      </TabPanel>
    </div>
  );
}
