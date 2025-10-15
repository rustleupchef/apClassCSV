let csvText = `Question #,Question Text,Answer 1,Answer 2,"Answer 3\n(Optional)","Answer 4\n(Optional)","Time Limit (sec)\n(Max: 300 seconds)","Correct Answer(s)\n(Only include\nAnswer #)"\n`;

document.addEventListener("DOMContentLoaded", () => {
    const add = document.getElementById("add");
    const clear = document.getElementById("clear");
    const save = document.getElementById("save");

    add.addEventListener("click", async () => {
        let tabs = await browser.tabs.query({active: true, currentWindow: true});
        let port = browser.tabs.connect(tabs[0].id, {name: "popup-port"});

        port.postMessage({ message: "GRAB" });

        port.onMessage.addListener(msg => {
            csvText += msg.response;
        });
    });

    clear.addEventListener("click", async () => {
        csvText = `Question #,Question Text,Answer 1,Answer 2,"Answer 3\n(Optional)","Answer 4\n(Optional)","Time Limit (sec)\n(Max: 300 seconds)","Correct Answer(s)\n(Only include\nAnswer #)"\n`;
    });

    save.addEventListener("click", async () => {
        downloadFile("download.csv", csvText);
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