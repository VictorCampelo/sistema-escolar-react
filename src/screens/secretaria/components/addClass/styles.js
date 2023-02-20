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
    justifyContent: "space-evenly",
    marginTop: "8px",
    flexWrap: "wrap"
  },
  fieldsContainer: {
    width: "100%",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingRight: "16px",
    flexWrap: "wrap"
  },
  bullet: {
    display: "inline-block",
    margin: "0 2px",
    transform: "scale(0.8)"
  },
  smallCards: {
    minWidth: 350,
    maxWidth: "100vw",
    height: "65vh",
    marginLeft: "10px",
    width: "fit-content",
    marginBottom: "10px"
  },
  bigCards: {
    minWidth: 350,
    maxWidth: "100vw",
    height: "65vh",
    marginLeft: "10px",
    width: "55vw",
    marginBottom: "10px"
  },
  title: {
    fontSize: 14
  },
  pos: {
    marginBottom: 12
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
  textField: {
    minWidth: "99.8px"
  },
  formControl: {
    margin: 1,
    minWidth: 120,
    width: "100%",
    maxWidth: "100%"
  },
  chips: {
    display: "flex",
    flexWrap: "wrap"
  },
  chip: {
    margin: 2
  },
  noLabel: {
    marginTop: 3
  },
  extendedIcon: {
    marginRight: 5
  },
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: "#fff"
  }
}));

