import { makeStyles } from "@material-ui/core";

export const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
    maxWidth: "70vw",
    minWidth: 350,

    height: "85vh"
  },
  container: {
    width: "100%",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-around",
    padding: "10px",
    flexWrap: "wrap"
  },
  bullet: {
    display: "inline-block",
    margin: "0 2px",
    transform: "scale(0.8)"
  },
  smallCards: {
    minWidth: 275,
    maxWidth: 350,
    height: "84vh",
    marginLeft: "10px",
    width: "fit-content",
    marginBottom: "10px"
  },
  bigCards: {
    minWidth: 275,
    maxWidth: 600,
    height: "84vh",
    marginLeft: "10px",
    width: "100%",
    marginBottom: "10px"
  },
  textField: {
    minWidth: "99.8px",
    width: "min-content"
  },
  fieldsContainer: {
    width: "100%",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: "10px",
    flexWrap: "wrap"
  },
  title: {
    fontSize: 14
  },
  pos: {
    marginBottom: 12,
    fontSize: 12
  },
  grades: {
    marginBottom: 3
  },
  grid: {
    marginTop: 10,
    width: "100%"
  },
  list: {
    fontSize: 10
  },
  avatar: {
    backgroundColor: "#3f51b5"
  },
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: "#fff"
  },
  paper: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column"
  }
}));

