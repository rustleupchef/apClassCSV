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
            
            const questions = document.querySelectorAll(".lrn_question");

            console.log(questions);
            console.log(sep);

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

                
                set = shuffleArray(set);

                let index = -1;
                for (let j = 0; j < set.length; j++) {
                    if (set[j].classList.contains("--correct")) {
                        index = j;
                    }
                }
                
                csvTxt += `"${questions[i].innerText}","${set[0].innerText.substring(1)}","${set[1].innerText.substring(1)}","${set[2].innerText.substring(1)}","${set[3].innerText.substring(1)}",20,"${index + 1}"\n`
            }

            port.postMessage({response: csvTxt});
        });
    }
});

function shuffleArray(array) {
  let currentIndex = array.length, randomIndex;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}