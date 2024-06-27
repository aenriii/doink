import { type ConfigJSON, type SourceRootManifest } from "./types";
/**
 * 
 * Creates a multithreaded probably slow channel for interscope communication.
 * 
 * @returns (T) -> Promise<void> a function who's returns can be awaited until the T sent has been recieved
 * @returns () -> Promise<T> a promise for returning the next available write, in order
 */
export function channel<T>(): [(value: T) => Promise<void>, () => Promise<T>] {

    let readQueue: ((value: T) => void)[] = [];
    let writeQueue: ((listener: (value: T) => void) => void)[] = [];

    let write = (value: T) => {
        return new Promise<void>((res) => {
            let reader = readQueue.shift();
            if (reader) {
                reader(value);
                res()
            } else {
                writeQueue.push((newReader) => {newReader(value); res();})
            }
        })
    }

    let read = () => {
        return new Promise<T>((res) => {
            let writer = writeQueue.shift();
            if (writer) {
                writer(res);
            } else {
                readQueue.push(res);
            }
        })
    }

    return [write, read];

}



export class Config {
    private source: string
    private obj: ConfigJSON
    private score: number;

    private constructor( filename: string, obj: ConfigJSON ) {
        this.source = filename
        this.obj = obj
        this.score = 0;
    }

    static async init( filename: string ): Promise<Config> {

        return new Config(
            filename,
            await Bun.file(filename).json()
        )

    }

    save() {
        Bun.write(this.source, JSON.stringify(this.obj)).then(x => this.score += x);
    }


    //#region Server

    
    public get port(): number {
        return this.obj.port ?? 80
    }

    //#endregion Server

    //#region Discord Bot

    public get discordBotToken() { return this.obj.discord.token }

    public get broadcastChannelId() { return this.obj.discord.broadcastChannelId }

    public isUserOwner(id: number): boolean {
        return this.obj.discord.ownerIds.includes(id);
    }

    //#endregion Discord Bot

    //#region Source Roots

    public getSourceRootPathForRepo(owner: string, repo: string): string | null {

        for (const element of this.obj.sourceRoots ?? []) {
            if (
                element.github.repoOwner == owner &&
                element.github.repoName == repo
            ) {
                return element.absPath;
            }
        }

        if (!this.obj.sourceRootOptions.createByRequest) return null;
        if (this.obj.sourceRootOptions
            .dynamicCreateRepoOwners?.includes(owner.toLowerCase())
        ) {
            if (!this.obj.sourceRoots) this.obj.sourceRoots = [];
            const root = `${this.obj.sourceRootOptions.createdSourceRoot ?? "~/"}${owner}/${repo}`;
            this.obj.sourceRoots!.push({
                absPath: root,
                github: {
                    repoOwner: owner,
                    repoName: repo,
                    filter: "",
                    secret: "",
                },
                lastUpdatedAt: 0
            });

            return root
        }
        return null;
    }

    public createNewSourceRoot(owner: string, repo: string, createSecret: boolean = true): SourceRootManifest {
        return {
            absPath: `${this.obj.sourceRootOptions.createdSourceRoot ?? "~/"}${owner}/${repo}`,
            lastUpdatedAt: 0,
            github: {
                repoOwner: owner,
                repoName: repo,
                filter: "",
                secret: createSecret ? crypto.randomUUID() : ""
            }
        }
    }

    public getSourceRoot(owner: string, repo: string): SourceRootManifest | null {
        for (const element of this.obj.sourceRoots ?? []) {
            if (
                element.github.repoOwner == owner &&
                element.github.repoName == repo
            ) {
                return element;
            }
        }
        return null;
    }
    public repoAlreadyExists(owner: string, repo: string): boolean {
        return !!this.getSourceRoot(owner, repo)
    }

    

    //#endregion Source Roots
}

const encoder = new TextEncoder();

export async function verifySignature(secret: string, signature: string, payload: string) {
    let sigHex = signature;

    let algorithm = { name: "HMAC", hash: { name: 'SHA-256' } };

    let keyBytes = encoder.encode(secret);
    let extractable = false;
    let key = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        algorithm,
        extractable,
        [ "sign", "verify" ],
    );

    let sigBytes = hexToBytes(sigHex);
    let dataBytes = encoder.encode(payload);
    let equal = await crypto.subtle.verify(
        algorithm.name,
        key,
        sigBytes,
        dataBytes,
    );

    return equal;
}

function hexToBytes(hex: string) {
    let len = hex.length / 2;
    let bytes = new Uint8Array(len);

    let index = 0;
    for (let i = 0; i < hex.length; i += 2) {
        let c = hex.slice(i, i + 2);
        let b = parseInt(c, 16);
        bytes[index] = b;
        index += 1;
    }

    return bytes;
}
