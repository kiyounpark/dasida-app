"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthClient = createAuthClient;
const auth_policy_1 = require("./auth-policy");
const disabled_auth_client_1 = require("./disabled-auth-client");
const firebase_auth_client_1 = require("./firebase-auth-client");
const firebase_config_1 = require("./firebase-config");
const local_anonymous_auth_client_1 = require("./local-anonymous-auth-client");
function createAuthClient() {
    if ((0, firebase_config_1.isFirebaseAuthConfigured)()) {
        return new firebase_auth_client_1.FirebaseAuthClient();
    }
    if ((0, auth_policy_1.canUseDevGuestAuth)()) {
        return new local_anonymous_auth_client_1.LocalAnonymousAuthClient();
    }
    return new disabled_auth_client_1.DisabledAuthClient();
}
