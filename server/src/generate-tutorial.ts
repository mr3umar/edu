import { generateContextualTutorial } from "./tutorial-service-openai2.js";

// const prompt = `اكتب وحل تمرين لقسمة مطولة ٢٤٠ / ٣`
const prompt = `اشرح بطريقة مشوقة القيم المنزلية للأرقام في العدد ٤٢٨١٣`
// const prompt = `اشرح بطريقة مشوقة المقارنة بين العدد ٤ و ٢`

;(async () => {
        const result = await generateContextualTutorial("0", prompt)

        // console.log(result.svg)
        // console.log(JSON.stringify(result.steps, null, '\t'))
        console.log(JSON.stringify(result, null, '\t'))
})()