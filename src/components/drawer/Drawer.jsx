import { SwipeableDrawer } from "@material-ui/core";
import CssBaseline from "@material-ui/core/CssBaseline";
import Divider from "@material-ui/core/Divider";
import Hidden from "@material-ui/core/Hidden";
import IconButton from "@material-ui/core/IconButton";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import { AllInbox, Apartment, Home, ImportContacts, School } from "@material-ui/icons";
import CloseIcon from "@material-ui/icons/Close";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  const S = useStyles();
  const theme = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
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
            }
          }
          setAreas([...localAreas]);
        } catch (error) {
          console.error(error);
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

  const drawer = (
    <div>
      <div className={S.toolbar}>
        <IconButton onClick={onClose} color="primary" aria-label="Close Sidedrawer">
          <CloseIcon />
        </IconButton>
      </div>
      <Divider />
      <List>
        ,
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
    </div>
  );

  const container = window ? () => window().document.body : null;

  return (
    <div className={S.root}>
      <CssBaseline />
      <nav className={S.drawer} aria-label="menu">
        {/* The implementation can be swapped with js to avoid SEO duplication of links. */}
        <Hidden smUp implementation="css">
          <SwipeableDrawer
            container={container}
            variant="temporary"
            anchor={theme.direction === "rtl" ? "right" : "left"}
            open={mobileOpen}
            onClose={handleDrawerToggle}
            onOpen={() => {

            }}
            classes={{
              paper: S.drawerPaper
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
              paper: S.drawerPaper
            }}
            variant="temporary"
            open={open}
            onClose={onClose}
            onOpen={() => {

            }}
            disableSwipeToOpen={false}>
            {drawer}
          </SwipeableDrawer>
        </Hidden>
      </nav>
    </div>
  );
}

export default ResponsiveDrawer;
