import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CssBaseline from "@material-ui/core/CssBaseline";
import Divider from "@material-ui/core/Divider";
import Hidden from "@material-ui/core/Hidden";
import IconButton from "@material-ui/core/IconButton";

import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import CloseIcon from "@material-ui/icons/Close";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import { makeStyles, useTheme } from "@material-ui/core/styles";

import {
  Home,
  ImportContacts,
  AllInbox,
  Apartment,
  School
} from "@material-ui/icons";
import { SwipeableDrawer } from "@material-ui/core";
import { useAuth } from "../../hooks/useAuth";
import { usersListRef } from "../../services/databaseRefs";

const drawerWidth = 300;

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex"
  },
  drawer: {
    [theme.breakpoints.up("sm")]: {
      width: drawerWidth,
      flexShrink: 0
    }
  },
  appBar: {
    [theme.breakpoints.up("sm")]: {
      width: `calc(100% - ${drawerWidth}px)`,
      marginLeft: drawerWidth
    }
  },
  menuButton: {
    marginRight: theme.spacing(2),
    [theme.breakpoints.up("sm")]: {
      display: "none"
    }
  },
  // necessary for content to be below app bar
  toolbar: theme.mixins.toolbar,
  drawerPaper: {
    width: drawerWidth
  },
  content: {
    flexGrow: 1,
    position: "relative",
    padding: theme.spacing(3)
  },
  fullList: {
    width: "auto"
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
    width: "95%"
  },
  selectEmpty: {
    marginTop: theme.spacing(2)
  }
}));

function ResponsiveDrawer(props) {
  const { window, open, onClose } = props;
  const classes = useStyles();
  const theme = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const { user } = useAuth();
  const [areas, setAreas] = useState([]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (user && user !== "Searching user...") {
        const snapshot = await usersListRef.child(user.id).once("value");
        try {
          const userAccess = snapshot.val().acessos;
          const localAreas = [];

          if (userAccess.professores) {
            localAreas.push({ text: "Professores", to: "professores", icon: 1 });
          }
          if (userAccess.master) {
            localAreas.push({ text: "Administração", to: "adm", icon: 2 });
            localAreas.push({ text: "Secretaria", to: "secretaria", icon: 0 });
          } else {
            if (userAccess.adm) {
              localAreas.push({ text: "Administração", to: "adm", icon: 2 });
            }
            if (userAccess.secretaria) {
              localAreas.push({ text: "Secretaria", to: "secretaria", icon: 0 });
            }
            if (userAccess.aluno) {
              localAreas.push({ text: "Estudante", to: "estudante", icon: 3 });
              setIsStudent(true);
            }
          }
          setAreas([...localAreas]);
        } catch (error) {
          console.log(error);
        }
      }
    };
    fetchData();
  }, [user]);

  const [age, setAge] = useState("");

  const handleChange = (event) => {
    setAge(event.target.value);
  };

  const firstIcons = [<AllInbox />, <ImportContacts />, <Apartment />, <School />];

  const SelectSchool = () => (<List>
    <FormControl className={classes.formControl}>
      <InputLabel id="demo-simple-select-label">Escola</InputLabel>
      <Select
        labelId="simple-select-label"
        id="simple-select"
        value={age}
        onChange={handleChange}
      >
        <MenuItem value={10}>Ten</MenuItem>
        <MenuItem value={20}>Twenty</MenuItem>
        <MenuItem value={30}>Thirty</MenuItem>
      </Select>
    </FormControl>
  </List>);

  const drawer = (
    <div>
      <div className={classes.toolbar}>
        <IconButton onClick={onClose} color="primary" aria-label="Close Sidedrawer">
          <CloseIcon />
        </IconButton>
      </div>
      <Divider />

      {!isStudent && <SelectSchool />}

      <Divider />
      <List>,
        <Link to="/" style={{ textDecoration: "none", color: "black" }} onClick={onClose}>
          <ListItem button key={"Home"}>
            <ListItemIcon>
              <Home />
            </ListItemIcon>
            <ListItemText primary={"Home"} />
          </ListItem>
        </Link>
      </List>
      <Divider />
      <List>
        {areas.map((elem, index) => (
          <Link
            key={index}
            to={"/" + elem.to}
            style={{ textDecoration: "none", color: "black" }}
            onClick={onClose}>
            <ListItem button key={elem.text}>
              <ListItemIcon>{firstIcons[elem.icon]}</ListItemIcon>
              <ListItemText primary={elem.text} />
            </ListItem>
          </Link>
        ))}
      </List>
      {/* <Divider />
        <List>
            {['All mail', 'Trash', 'Spam'].map((text, index) => (
            <ListItem button key={text}>
                <ListItemIcon></ListItemIcon>
                <ListItemText primary={text} />
            </ListItem>
            ))}
        </List> */}
    </div>
  );

  const container = window !== undefined ? () => window().document.body : undefined;

  return (
    <div className={classes.root}>
      <CssBaseline />
      <nav className={classes.drawer} aria-label="menu">
        {/* The implementation can be swapped with js to avoid SEO duplication of links. */}
        <Hidden smUp implementation="css">
          <SwipeableDrawer
            container={container}
            variant="temporary"
            anchor={theme.direction === "rtl" ? "right" : "left"}
            open={mobileOpen}
            onClose={handleDrawerToggle}
            classes={{
              paper: classes.drawerPaper
            }}
            ModalProps={{
              keepMounted: true // Better open performance on mobile.
            }}>
            {drawer}
          </SwipeableDrawer>
        </Hidden>
        <Hidden xsDown implementation="css">
          <SwipeableDrawer
            classes={{
              paper: classes.drawerPaper
            }}
            variant="temporary"
            open={open}
            onClose={onClose}
            disableSwipeToOpen={false}>
            {drawer}
          </SwipeableDrawer>
        </Hidden>
      </nav>
    </div>
  );
}

export default ResponsiveDrawer;
