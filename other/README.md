docker build -t claude-dev .


cd ~/Documents/edu-ai-2

docker volume create claude-config

cd ./web

docker run -it \
  --name claude-dev \
  --network=bridge \
  --cap-drop=ALL \
  --security-opt=no-new-privileges \
  -v "$PWD:/workspace" \
  -v claude-config:/root/.claude \
  -w /workspace \
  claude-dev


docker start -ai claude-dev


##  Cost optimization:

1. Use Sonnet as your default
/model
You'll get a model selector. Choose Sonnet.
Or start Claude with Sonnet directly
You can specify the model when launching Claude:
claude --model sonnet

2. finish task
    ↓
/clear
    ↓
new task
or /compact when you're continuing the same task but the conversation is getting large.

3. Make Claude inspect, then implement
Don't do this:
"Build my whole Customers page."
Instead:
First inspect the existing Customers-related components,
layouts, styles and one existing page.
Do not modify anything.
Tell me which components you will reuse.
Then:
Implement it now.
Only modify the files we identified.
This prevents Claude from reading half your repository and making unnecessary changes.

6. Create reusable components once
This is probably the biggest practical optimization for your project.
Instead of asking Claude to build this on every page:
Button
Card
Input
Modal
Toolbar
PageHeader
Table
Tabs
have it establish:
src/components/ui/
once.
Then subsequent requests become:
Create Customers page.
Reuse Card, Button, Input, PageHeader and Table.
Claude has less work to do and your UI becomes much more consistent.


8. Take advantage of caching
Anthropic says repeated project content can benefit from caching, so don't repeatedly paste the same architecture/design information into prompts.
For example, put stable information in:
CLAUDE.md
and keep your actual source files in the project.
Then your prompt can simply say:
Implement the Customers page following the project UI rules.
rather than pasting 100 lines of requirements every time.

9. Don't automatically enable usage credits