browser.runtime.onConnect.addListener(port => {
    if (port.name === "popup-port") {
        port.onMessage.addListener(msg => {
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

            port.postMessage({response: csvTxt});
        });
    }
});

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