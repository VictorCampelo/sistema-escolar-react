import { createContext, Fragment, useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import { onMessageListener } from "../services/firebase";
import Notifications from "../components/shared/Notifications";
import { useSnackbar } from "notistack";

import "./App.css";
import Secretaria from "../screens/secretaria/Secretaria";
import Navbar from "../components/navbar/Navbar";
import { AuthContextProvider } from "../contexts/AuthContext";
import Home from "../screens/home/Home";

import { ConfirmationServiceProvider } from "../contexts/ConfirmContext";
import Professores from "../screens/professores/Professores";
import Administration from "../screens/adm/Administration";
import ExternalEnroll from "../screens/estudante/matricula/ExternalEnroll";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import "./../styles/style.css";

export const AuthContext = createContext({});

function App() {
  const [show, setShow] = useState(false);
  const [notification, setNotification] = useState({ title: "", body: "" });

  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (show) {
      enqueueSnackbar(notification.body, {
        title: notification.title,
        variant: "info",
        anchorOrigin: { horizontal: "right", vertical: "bottom" }
      });
    }
  }, [notification]);

  onMessageListener()
    .then((payload) => {
      setShow(true);
      setNotification({
        title: payload.notification.title,
        body: payload.notification.body
      });
      let storedNotifications = JSON.parse(localStorage.getItem("notifications"));
      if (storedNotifications) {
        storedNotifications.push({
          title: payload.notification.title,
          body: payload.notification.body
        });
      } else {
        storedNotifications = [
          {
            title: payload.notification.title,
            body: payload.notification.body
          }
        ];
      }
      localStorage.setItem("notifications", JSON.stringify(storedNotifications));

    })
    .catch((err) => console.log("failed: ", err));

  return (
    <Fragment>
      <Notifications />
      <Router>
        <ConfirmationServiceProvider>
          <AuthContextProvider>
            {window.location.pathname !== "/estudante/matricula" && <Navbar />}
            <Route
              render={({ location }) => (
                <TransitionGroup>
                  <CSSTransition timeout={100} key={location.key} classNames="fade">
                    <Switch>
                      <Route path="/" exact component={Home} />
                      <Route path="/secretaria" component={Secretaria} />
                      <Route path="/professores" component={Professores} />
                      <Route path="/adm" component={Administration} />
                      <Route path="/estudante/matricula" exact component={ExternalEnroll} />
                    </Switch>
                  </CSSTransition>
                </TransitionGroup>
              )}
            />
          </AuthContextProvider>
        </ConfirmationServiceProvider>
      </Router>
    </Fragment>
  );
}

export default App;
