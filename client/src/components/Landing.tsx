import React, { useEffect } from 'react';
import Button from 'plaid-threads/Button';
// @ts-ignore
import { useHistory } from 'react-router-dom';

import { useUsers, useCurrentUser } from '../services';
import { Login, Banner, AddUserForm } from '.';

import { useBoolean } from '../hooks';

export default function Landing() {
  const { getUsers, usersById } = useUsers();
  const { userState, setCurrentUser } = useCurrentUser();
  const [isAdding, hideForm, toggleForm] = useBoolean(false);
  const history = useHistory();

  useEffect(() => {
    getUsers();
  }, [getUsers, usersById]);

  useEffect(() => {
    if (userState.newUser != null) {
      setCurrentUser(userState.newUser);
    }
  }, [getUsers, usersById, setCurrentUser, userState.newUser]);

  const returnToCurrentUser = () => {
    history.push(`/user/${userState.currentUser.id}`);
  };

  return (
    <div>
      <Banner initialSubheading />
      If you don't have an account, please click "Add New User." Once created,
      you can add as many example Link items as you like.
      <div className="btnsContainer">
        <Login />
        <Button className="btnWithMargin" onClick={toggleForm} centered inline>
          Add New User
        </Button>
        {userState.currentUser.username != null && (
          <Button
            className="btnWithMargin"
            centered
            inline
            onClick={returnToCurrentUser}
          >
            Return to Current User
          </Button>
        )}
      </div>
      {isAdding && <AddUserForm hideForm={hideForm} />}
    </div>
  );
}