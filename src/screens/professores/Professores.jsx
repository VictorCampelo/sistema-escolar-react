import ProfessoresTabs from "./components/Tabpanel";

import { Fragment } from "react";
import LoginDialog from "../login/LoginDialog";
import { useAuth } from "../../hooks/useAuth";

const Professores = () => {
  const { user } = useAuth();

  return (
    <Fragment>
      <ProfessoresTabs />
      {!user && <LoginDialog />}
    </Fragment>
  );
};

export default Professores;
