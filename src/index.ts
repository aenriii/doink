import type { PushEvent, WebhookEvent } from "@octokit/webhooks-types";
import { channel, Config, verifySignature } from "./util";

// fixme make object for this
const [webhookP, webhookC] = channel<WebhookEvent>();

export const config = await Config.init("./data.json");

let server = Bun.serve({
    async fetch(request, server) {
        if (new URL(request.url).pathname != "/github-checkpoint" || request.method != "POST") {
            console.warn("Bad Request!");
            return new Response(null, { status: 404 });
        }
        if ([
            // request.headers.get("X-Hub-Signature-256"), // commented in case of no-secret
            request.headers.get("X-GitHub-Delivery"),
            request.headers.get("X-GitHub-Event")
        ].includes(null)) {
            console.warn("Failed to recieve Github Webhook: Failed to provide correct headers")
            return new Response("Failed to provide correct headers", { status: 400 });
        }

        // i dont like try but i also dont want a malformed request to boot the app off
        try {
            const data = await request.text();
            const webhook = JSON.parse(data) as WebhookEvent;

            switch (request.headers.get("X-GitHub-Event")) {
                case "push":
                    let hookData = webhook as PushEvent 
                    let repoOwner = hookData.repository.owner.login
                    let repoName = hookData.repository.name

                    console.log(`Checking validity of webhook from ${repoOwner}/${repoName}`);
                    
                    let sourceRootManifest = config.getSourceRoot(repoOwner, repoName);

                    if (sourceRootManifest?.github.secret == "") {
                        console.log("Secret not available.")
                    } else {
                        console.time("Verify Signature...");
                        let isValid = await verifySignature(
                            sourceRootManifest?.github.secret!,
                            request.headers.get("X-Hub-Signature-256")!,
                            data
                        );
                        console.timeEnd("Verify Signature...")
                        console.log(`Signature was${!isValid? " not" : ""} valid!`);
                    }

                    break;
            
                default:
                    console.log(`Not replying to event ${request.headers.get("X-GitHub-Event")}`);
                    break;
            }
            

        } catch {
            console.warn("Failed to validate!")
            return new Response("Error occured during validation.", { status: 500 });
        }
    },
    unix: undefined,
    websocket: {
        open(ws) {
            ws.send("BRO GET OUTTTTTT");
            ws.close();
        },
        message(ws, message) {
        },
    }

});
console.log("hello!")