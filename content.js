browser.runtime.onConnect.addListener(port => {
    if (port.name === "popup-port") {
        port.onMessage.addListener(msg => {
            if (msg.message === "GRAB") {
                port.postMessage({response: grab()});
                port.disconnect();
            } else if (msg.message === "ANSWER") {
                answer();
            } else if (msg.message === "FORMAT") {
                format();
            } else if (msg.message === "FILL") {
                fill();
            }
        });
    }
});

function selectFile(accepted) {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.style = "position:fixed;top:10px;right:10px;z-index:999999;";
        input.type = 'file';
        input.accept = accepted;
        document.body.appendChild(input);
        input.addEventListener('change', () => {
            const file = input.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve(e.target.result);
            };
            reader.readAsText(file);
            document.body.removeChild(input);
        });
    });
}

function indexOfLetter(letter) {
    const num = parseInt(letter);
    if (!isNaN(num)) {
        return num;
    }
    return letter.toUpperCase().charCodeAt(0) - 65 + 1;
}

async function fill() {
    const answers = await selectFile('.json');
    const answersJson = JSON.parse(answers);

    const qTag = document.querySelector(".h-\\[32px\\] > span:nth-child(2)").innerText.split(" of ");
    const totalQuestion = parseInt(qTag[1]);

    if (parseInt(qTag[0]) !== 1) {
        alert("Please make sure you are on the first question of the set.");
        return;
    }

    let nextButton = document.querySelector("[data-test-id='next-button']");
    for (let i = 0; i < totalQuestion; i++) {
        const viewPort = document.querySelectorAll(".lrn-assess-content")[i];
        const options = viewPort.querySelectorAll(".lrn-mcq-option");

        if (answersJson[i].answer === undefined) {
            nextButton.click();
            await sleep(1000);
            nextButton = document.querySelector("[data-test-id='next-button']");
            continue;
        }

        const answerIndex = indexOfLetter(answersJson[i].answer);
        options[answerIndex - 1].children[0].click();
        await sleep(500);

        nextButton.click();
        await sleep(1000);
        nextButton = document.querySelector("[data-test-id='next-button']");
    }
}

async function format() {
    const questions = await selectFile('.json');
    const answerKeys = await selectFile('.json');

    const questionsJson = JSON.parse(questions);
    const answersJson = JSON.parse(answerKeys);

    let csvText = `Blooket Template,,,,,,,\nQuestion #,Question Text,Answer 1,Answer 2,"Answer 3\n(Optional)","Answer 4\n(Optional)","Time Limit (sec)\n(Max: 300 seconds)","Correct Answer(s)\n(Only include\nAnswer #)"\n`;

    for (let i = 0; i < questionsJson.length; i++) {
        const q = questionsJson[i];
        const a = answersJson[i];

        const question = `${i + 1}# Question: ${q.question}; Passage: ${q.passage ? q.passage : ''}`;
        let options = q.options;
        for (let j = 0; j < options.length; j++) {
            options[j] = String(options[j].split("\n\n")[1]).substring(0, 8) + " " + options[j].split("\n\n")[0];
        }
        let set = [];
        let answerIndex = indexOfLetter(a.answer);
        
        set.push(options[answerIndex - 1]);
        for (let j = 0; j < options.length && set.length < 4; j++) {
            if (options[j] !== set[0]) {
                set.push(options[j]);
            }
        }

        console.log(set);
        let answer = set[0];
        set = shuffleArray(set);

        let correctIndex = set.indexOf(answer) + 1;

        csvText += `${i + 1},"${question}","${set[0] ? set[0] : ""}","${set[1] ? set[1] : ""}","${set[2] ? set[2] : ""}","${set[3] ? set[3] : ""}",20,"${correctIndex}"\n`;
    }

    downloadFile("formatted_questions.csv", csvText);
}

async function answer() {
    const apiKey = prompt("Enter your API key or Type GRAB if you want don't care about the answer:");
    const version = apiKey === "GRAB";
    
    const qTag = document.querySelector(".h-\\[32px\\] > span:nth-child(2)").innerText.split(" of ");
    const totalQuestion = parseInt(qTag[1]);

    let jsonFormat = [];

    if (parseInt(qTag[0]) !== 1) {
        alert("Please make sure you are on the first question of the set.");
        return;
    }

    let nextButton = document.querySelector("[data-test-id='next-button']");
    let csvText = "";
    for (let i = 0; i < totalQuestion; i++) {
        const viewPort = document.querySelectorAll(".lrn-assess-content")[i];
        
        const question = viewPort.querySelector(".lrn_question");
        const options = viewPort.querySelectorAll(".lrn-mcq-option");
        const passage = viewPort.querySelector(".passage");
        const questionImages = viewPort.querySelectorAll("img");

        let imgParts = [];
        for (const img of questionImages) {
            const base64 = await getBase64FromImg(img);
            imgParts.push({
                inline_data: {
                    mime_type: "image/png",
                    data: base64
                }
            });
        }

        const promptParts = [
            {text: "Question: " + question.innerText},
            passage ? {text: "Passage: " + passage.innerText} : null,
            ...imgParts,
            {text: "Options: " + Array.from(options).map((opt, idx) => String.fromCharCode(65 + idx) + ". " + opt.innerText).join(" ")}
        ].filter(Boolean);

        const payload = {
            system_instruction: {
                parts: [
                    {text: "Provide the correct answer option (A, B, C, or D) for the given question and options.\n\nYour are concise so you ONLY return the index of the letter (A = 1, B = 2, C = 3, D = 4, etc)."}
                ]
            },
            contents: [
                {role: "user", parts: promptParts}
            ],
            generation_config: {
                maxOutputTokens: 1000,
                temperature: 0.0,
            }
        };
        
        const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;

        let data;
        if (!version) {
            let response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            data = await response.json();
        }

        console.log(data);

        if (!version && data.error) {
            if (data.error.code === 503) {
                await sleep(2 * 60 * 1000);
            } else {
                let message = data.error.message.split(" ");
                let waitTime = message[message.length - 1];
                if (waitTime.endsWith("ms.")) {
                    await sleep(parseInt(waitTime.slice(0, -3)) + 1000);
                } else {
                    await sleep(parseInt(parseFloat(waitTime.slice(0, -2)) * 1000) + 1000);
                }
            }

            response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            data = await response.json();
        }
        console.log(data);

        let text;
        if (!version) {
            try { text = data.candidates[0].content.parts[0].text.trim(); }
            catch (e) { text = ""; }
        }
        console.log(text);

        csvText += `"Question:${question.innerText}\n${passage ? 'Passage' + passage.innerText : ''}",`
        for (let j = 0; j < options.length; j++) {
            csvText += `"${options[j].innerText}",`;
        }

        for (let j = 0; j < questionImages.length; j++) {
            csvText += `"${questionImages[j].src}",`;
        }

        csvText += !version ? `"${extractInteger(text)}"\n` : "\n"
        jsonFormat.push({
            question: question.innerText,
            passage: passage ? passage.innerText : null,
            options: Array.from(options).map(opt => opt.innerText),
            images: Array.from(questionImages).map(img => img.src),
            answer: !version ? extractInteger(text) : null
        });

        nextButton.click();
        await sleep(!version ? 4000 : 1000);
        nextButton = document.querySelector("[data-test-id='next-button']");
    }

    downloadFile("answers.csv", csvText);
    downloadFile("answers.json", JSON.stringify(jsonFormat, null, 2));
}

function extractInteger(str) {
    for (let i = 0; i < str.length; i++) {
        if (!isNaN(parseInt(str[i]))) {
            let numStr = "";
            while (i < str.length && !isNaN(parseInt(str[i]))) {
                numStr += str[i];
                i++;
            }
            return numStr;
        }
    }
    return str;
}

async function getBase64FromImg(imgElement) {
    const src = imgElement.src;
    const response = await fetch(src);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    }); 
}

function sleep(ms) {
    console.log(ms);
    return new Promise(resolve => setTimeout(resolve, ms));
}

function grab() {
    const options = Array.from(document.querySelectorAll(".mcq-option"));
    let sep = [];
    options.forEach(option => {
        const option1 = option.cloneNode(true);
        if (option1.ariaLabel.startsWith("Option A")) {
            sep.push([]);
        }
        sep[sep.length - 1].push(option1);
    });
    const questions = document.querySelectorAll(".lrn_question");

    let csvTxt = "";
    for (let i = 0; i < questions.length; i++) {
        let set = [];
        csvTxt += (i + 1).toString() + ",";
        let optionsSet = sep[i];

        for (let j = 0; j < optionsSet.length; j++) {
            if (optionsSet[j].children[2].children[0].classList.contains("--correct")) {
                set = optionsSet.splice(j, 1);
            }
        }

        for (let j = 0; j < optionsSet.length && j < 3; j++) {
            set.push(optionsSet[j]);
        }

        set = shuffleArray(set);

        let index = 1;
        for (let j = 0; j < set.length; j++) {
            if (set[j].children[2].children[0].classList.contains("--correct")) {
                index = j + 1;
            }
        }
        
        csvTxt += `"${questions[i].innerText}","${set[0] ? set[0].innerText.substring(1) : ""}","${set[1] ? set[1].innerText.substring(1) : ""}","${set[2] ? set[2].innerText.substring(1) : ""}","${set[3] ? set[3].innerText.substring(1) : ""}",20,"${index}"\n`
    }
    return csvTxt;
}

function shuffleArray(array) {
  let currentIndex = array.length;
  let randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
}

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