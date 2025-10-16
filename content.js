browser.runtime.onConnect.addListener(port => {
    if (port.name === "popup-port") {
        port.onMessage.addListener(msg => {
            const options = document.querySelectorAll(".mcq-option");
            let sep = []
            for(let i = 0; i < options.length; i++) {
                if (options[i].ariaLabel.startsWith("Option A")) {
                    sep.push([]);
                }
                sep[sep.length - 1].push(options[i]);
            }
            
            console.log(sep);
            const questions = document.querySelectorAll(".lrn_question");

            let csvTxt = "";
            for (let i = 0; i < questions.length; i++) {
                csvTxt += (i + 1).toString() + ",";
                let optionsSet = sep[i];

                for (let j = 0; j < optionsSet.length; j++) {
                    if (optionsSet[j].classList.contains("--correct")) {
                        var set = optionsSet.splice(j, 1);
                    }
                }

                for (let j = 0; j < optionsSet.length && j < 3; j++) {
                    set.push(optionsSet[j]);
                }
                
                csvTxt += `"${questions[i].innerText}","${set[0].innerText.substring(1)}","${set[1].innerText.substring(1)}","${set[2].innerText.substring(1)}","${set[3].innerText.substring(1)}",20,"${0}"\n`
            }

            port.postMessage({response: csvTxt});
        });
    }
});