import SecretariaTabs from "./components/Tabpanel";

import { Fragment } from "react";
import LoginDialog from "../login/LoginDialog";
import { useAuth } from "../../hooks/useAuth";

const Secretaria = () => {
  const { user } = useAuth();

  return (
    <Fragment>
      <SecretariaTabs />
      {!user && <LoginDialog />}
    </Fragment>
  );
};

export default Secretaria;
