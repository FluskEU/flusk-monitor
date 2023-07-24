(function () {
    // keep reference to original functions
    let _error = window.console.error;
    let _warn = window.console.warn;
    const endpoint = "https://api.flusk.eu/api:monitor/webhook-front-end-errors";
    const WSURL = "wss://monitor-v1.flusk.eu";

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async function loadHtml2Canvas() {
        if (typeof html2canvas !== "undefined") {
            return;
        }

        try {
            await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
        } catch (error) {
            console.error("Failed to load html2canvas library:", error);
        }
    }
    loadHtml2Canvas();

    function stringify(obj) {
        let cache = [];
        let str = JSON.stringify(obj, function (key, value) {
            if (typeof value === "object" && value !== null) {
                if (cache.indexOf(value) !== -1) {
                    return;
                }
                cache.push(value);
            }
            return value;
        });
        cache = null;
        return str;
    }

    let sendToXano = function (arguments, screenshot) {
        let currentAppId = window.app._id;
        let data = {
            "app_id": currentAppId,
            "arguments": stringify(arguments),
            "screenshot": screenshot
        }
        try {
            let res = fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            console.log("Flusk Monitor is processing this error for criticality analyzing.");
        } catch (e) {
            console.log("An error appeared analyzing this log. Please contact Flusk at https://flusk.eu/contact");
        }
    }

    window.console.error = async function () {
        _error.apply(this, arguments);
        let screenshot = await takeScreenshot();
        sendToXano(arguments, screenshot);
    };

    let takeScreenshot = async function () {
        await loadHtml2Canvas();

        const element = document.body;
        let canvas = await html2canvas(element);
        const screenshotDataURL = canvas.toDataURL('image/png');

        //Host to Bubble server or ours
        return screenshotDataURL;
    }

    //WEBSOCKET SECTION
    const socket = new WebSocket(WSURL);

    socket.onopen = () => {
        console.info('Flusk Monitor error logger connected.');
    };

    socket.onmessage = (event) => {
        const message = event.data;
        if (message.includes("hello")) {
            let appId = window.app._id;
            let userUID = window.bubble_session_uid;
            let data = {
                appId: appId,
                message: "I'm here!",
                user_uid: userUID,
                code: 200
            }
            socket.send(JSON.stringify(data));
        }
    };

    socket.onclose = (event) => {
        console.error("Flusk Activity Logger has crashed.");
    };
})();