const csvText = `Blooket Template,,,,,,,\nQuestion #,Question Text,Answer 1,Answer 2,"Answer 3\n(Optional)","Answer 4\n(Optional)","Time Limit (sec)\n(Max: 300 seconds)","Correct Answer(s)\n(Only include\nAnswer #)"\n`;

document.addEventListener("DOMContentLoaded", () => {
    const save = document.getElementById("save");

    save.addEventListener("click", async () => {
        let tabs = await browser.tabs.query({active: true, currentWindow: true});
        let port = browser.tabs.connect(tabs[0].id, {name: "popup-port"});

        port.postMessage({ message: "GRAB" });

        port.onMessage.addListener(msg => {
            downloadFile("download.csv", csvText + msg.response);
        });
    });

    const answer = document.getElementById("answer");
    
    answer.addEventListener("click", async () => {
        let tabs = await browser.tabs.query({active: true, currentWindow: true});
        let port = browser.tabs.connect(tabs[0].id, {name: "popup-port"});
        port.postMessage({ message: "ANSWER" });
    });
});

function downloadFile(filename, textData) {
    const node = Object.assign(document.createElement('a'), {
        href: `data:text/plain;charset=utf-8,${encodeURIComponent(textData)}`,
        download: filename,
        style: 'display: none'
    });
    document.body.appendChild(node);
    node.click();
    document.body.removeChild(node);
}