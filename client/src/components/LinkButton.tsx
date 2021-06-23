import React, { useEffect } from 'react';
import Button from 'plaid-threads/Button';
import Touchable from 'plaid-threads/Touchable';
import { usePlaidLink } from 'react-plaid-link';
import { useHistory } from 'react-router-dom';

import { logEvent, logSuccess, logExit } from '../util'; // functions to log and save errors and metadata from Link events.
import { exchangeToken, setItemState } from '../services/api';
import { useItems, useLink } from '../services';

LinkButton.defaultProps = {
  isOauth: false,
  userId: null,
  itemId: null,
  token: '',
};

interface Props {
  isOauth: boolean;
  token: string;
  userId: number;
  itemId: number | null;
  children: React.ReactNode;
}

interface PlaidInstitution {
  name: string;
  institution_id: string;
}

interface PlaidAccount {
  id: string;
  name: string;
  mask: string;
  type: string;
  subtype: string;
  verification_status: string;
}

interface PlaidLinkOnSuccessMetadata {
  institution: null | PlaidInstitution;
  accounts: Array<PlaidAccount>;
  link_session_id: string;
}

interface PlaidLinkError {
  error_type: string;
  error_code: string;
  error_message: string;
  display_message: string;
}

interface PlaidLinkOnExitMetadata {
  institution: null | PlaidInstitution;
  // see possible values for status at https://plaid.com/docs/link/web/#link-web-onexit-status
  status: null | string;
  link_session_id: string;
  request_id: string;
}

// Uses the usePlaidLink hook to manage the Plaid Link creation.  See https://github.com/plaid/react-plaid-link for full usage instructions.
// The link token passed to usePlaidLink cannot be null.  It must be generated outside of this component.  In this sample app, the link token
// is generated in the link context in client/src/services/link.js.

export default function LinkButton(props: Props) {
  const token = props.token;
  const isOauth = props.isOauth;
  const userId = props.userId;
  const itemId = props.itemId;
  const history = useHistory();
  const { getItemsByUser, getItemById } = useItems();
  const { generateLinkToken } = useLink();

  // define onSuccess, onExit and onEvent functions as configs for Plaid Link creation
  const onSuccess = async (
    publicToken: string,
    metadata: PlaidLinkOnSuccessMetadata
  ) => {
    // log and save metatdata
    logSuccess(metadata, userId);
    if (itemId != null) {
      // update mode: no need to exchange public token
      await setItemState(itemId, 'good');
      getItemById(itemId, true);
      // regular link mode: exchange public token for access token
    } else {
      // call to Plaid api endpoint: /item/public_token/exchange in order to obtain access_token which is then stored with the created item
      await exchangeToken(publicToken, metadata, userId);
      getItemsByUser(userId, true);
    }
    history.push(`/user/${userId}`);
  };

  const onExit = async (
    error: PlaidLinkError,
    metadata: PlaidLinkOnExitMetadata
  ) => {
    // log and save error and metatdata
    logExit(error, metadata, userId);
    if (error != null && error.error_code === 'INVALID_LINK_TOKEN') {
      await generateLinkToken(userId, itemId);
    }

    // to handle other error codes, see https://plaid.com/docs/errors/
  };

  const config = {
    onSuccess,
    onExit,
    onEvent: logEvent,
    token,
    receivedRedirectUri: isOauth ? window.location.href : null, // add additional receivedRedirectUri config when handling an OAuth reidrect
  };

  const { open, ready } = usePlaidLink(config);

  useEffect(() => {
    // initiallizes Link automatically if it is handling an OAuth reidrect
    if (isOauth && ready) {
      open();
    }
  }, [ready, open, isOauth]);

  const handleClick = () => {
    // regular, non-OAuth case:
    // set link token, userId and itemId in local storage for use if needed later by OAuth
    localStorage.setItem(
      'oauthConfig',
      JSON.stringify({ userId, itemId, token })
    );
    open();
  };

  return (
    <>
      {isOauth ? (
        // no link button rendered: OAuth will open automatically by useEffect above
        <></>
      ) : itemId != null ? (
        // update mode: Link is launched from dropdown menu in the
        // item card after item is set to "bad state"
        <Touchable
          className="menuOption"
          disabled={!ready}
          onClick={() => {
            handleClick();
          }}
        >
          {props.children}
        </Touchable>
      ) : (
        // regular case for initializing Link from user card or from "add another item" button
        <Button
          centered
          inline
          small
          disabled={!ready}
          onClick={() => {
            handleClick();
          }}
        >
          {props.children}
        </Button>
      )}
    </>
  );
}