import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { getToken } from "../../services/firebase";

const Notifications = () => {
  const [isTokenFound, setTokenFound] = useState(false);

  const { user } = useAuth();

  console.log("Token found", isTokenFound);

  // To load once
  useEffect(() => {
    let data;

    async function tokenFunc() {
      data = await getToken(setTokenFound);
      if (data) {
        console.log("Token is", data);
      }
      return data;
    }

    tokenFunc();
  }, [setTokenFound]);

  return <></>;
};

Notifications.propTypes = {};

export default Notifications;
