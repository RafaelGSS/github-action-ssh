"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const node_ssh_1 = require("node-ssh");
const keyboard_1 = require("./keyboard");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const command = core.getInput('command');
        const host = core.getInput('host') || 'localhost';
        const username = core.getInput('username');
        const port = +core.getInput('port') || 22;
        const privateKey = core.getInput('privateKey');
        const password = core.getInput('password');
        const passphrase = core.getInput('passphrase');
        const tryKeyboard = !!core.getInput('tryKeyboard');
        const envs = core.getInput('envs');
        try {
            const ssh = yield connect(host, username, port, privateKey, password, passphrase, tryKeyboard);
            let env = '';
            if (envs) {
                env = envs.split(',').reduce((prev, curr) => {
                    return `${prev} ${curr}=${process.env[curr]}`;
                }, 'export');
                env += ';';
            }
            const commands = command.split(';');
            for (let i = 0; i < commands.length; i++) {
                const stdout = yield executeCommand(ssh, commands[i], env);
                core.setOutput(`cmd-${i + 1}`, stdout);
            }
            console.log('✅ SSH Action finished.');
            ssh.dispose();
        }
        catch (err) {
            core.setFailed(err);
        }
    });
}
function connect(host = 'localhost', username, port = 22, privateKey, password, passphrase, tryKeyboard) {
    return __awaiter(this, void 0, void 0, function* () {
        const ssh = new node_ssh_1.NodeSSH();
        console.log(`Establishing a SSH connection to ${host}.`);
        try {
            const config = {
                host: host,
                port: port,
                username: username,
                password: password,
                passphrase: passphrase,
                tryKeyboard: tryKeyboard,
                onKeyboardInteractive: tryKeyboard ? keyboard_1.keyboardFunction(password) : null
            };
            if (privateKey) {
                console.log('using provided private key');
                config.privateKey = privateKey;
            }
            yield ssh.connect(config);
            console.log(`🤝 Connected to ${host}.`);
        }
        catch (err) {
            console.error(`⚠️ The GitHub Action couldn't connect to ${host}.`, err);
            core.setFailed(err.message);
        }
        return ssh;
    });
}
function executeCommand(ssh, command, env) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Executing command: ${command}`);
        try {
            const { code, stdout, stderr } = yield ssh.execCommand(`${env} ${command}`);
            if (stderr) {
                throw new Error(stderr);
            }
            if (code > 0) {
                throw Error(`Command exited with code ${code}`);
            }
            return stdout;
        }
        catch (err) {
            console.error(`⚠️ An error happened executing command ${command}.`, (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : err);
            core.setFailed(err.message);
            process.abort();
        }
    });
}
process.on('uncaughtException', (err) => {
    if (err['code'] !== 'ECONNRESET')
        throw err;
});
run();
