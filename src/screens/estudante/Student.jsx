import StudentTabs from "./components/Tabpanel";
import { Fragment } from "react";
import { useAuth } from "../hooks/useAuth";
import LoginDialog from "../login/LoginDialog";

const Student = () => {
  const { user } = useAuth();

  return (
    <Fragment>
      <StudentTabs />
      {!user && <LoginDialog />}
    </Fragment>
  );
};

export default Student;
