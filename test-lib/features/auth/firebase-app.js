"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFirebaseAuthInstance = getFirebaseAuthInstance;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const app_1 = require("firebase/app");
const auth_1 = require("firebase/auth");
const firebase_config_1 = require("./firebase-config");
let cachedFirebaseAuth = null;
function getOrCreateFirebaseApp() {
    if ((0, app_1.getApps)().length > 0) {
        return (0, app_1.getApp)();
    }
    return (0, app_1.initializeApp)((0, firebase_config_1.getFirebaseClientConfig)());
}
function getFirebaseAuthInstance() {
    if (cachedFirebaseAuth) {
        return cachedFirebaseAuth;
    }
    const app = getOrCreateFirebaseApp();
    try {
        cachedFirebaseAuth = (0, auth_1.initializeAuth)(app, {
            persistence: (0, auth_1.getReactNativePersistence)(async_storage_1.default),
        });
    }
    catch {
        cachedFirebaseAuth = (0, auth_1.getAuth)(app);
    }
    return cachedFirebaseAuth;
}
