# LoL-Betting-Market
A complete Manifold Market application for mass-market betting for your League of Legends matches.

## Api / Backend
- Built with FastAPI
- Connects to the Riot Live Client API to detect active matches
- Generates a match card summarizing champion, role, KDA, CS, gold, damage, items, and spells
- Sends match cards to the Worker Relay via POST
- Creates Manifold markets using the Manifold API
- Broadcasts WebSocket events to the frontend

## Worker Relay (for deployment only)
- Implemented using a Cloudflare Durable Object
- Acts as the central message hub between backend and frontend
- Stores the last 10 matches in a SQLite‑backed DO table
- Exposes a REST endpoint /matches/latest for retrieving match history
- Handles WebSocket upgrades for real‑time market events
- Ensures consistent state even if backend or frontend restarts

## Frontend

- Built with Next.js (App Router)
- Displays the active Manifold market
- Shows your last 10 matches using data from the Worker Relay
- Connects to the Worker via WebSocket for real‑time updates
- Fully client‑side for WebSocket handling and live UI updates


## Getting Started
### Cloning the repository

You can clone the repository if you have remote Git set up on your system. Enter the following to clone the repo:

```git clone https://github.com/cyril-rimo/LoL-Betting-Market.git```

Otherwise, you can download a ZIP file of the repo and move it into a working folder.

### Api Keys
You’ll need the following keys to run the project:
- Riot API Key
    Required for accessing the Live Client API and match data. Visit <developer.riotgames.com>.
- Manifold API Key
    Required for creating and managing markets.
    ![alt text](assets/manifold-api.png)
- Worker URL
    The WebSocket/HTTP endpoint of your Cloudflare Worker Relay. Visit <dash.cloudflare.com>

### Environment
- a .env.local file in your frontend. See <frontend\.env.local>
- a .env file for your back end api. See <.env.example>

#### Packages
Environment Requirements
- Python 3.10+
- Node.js 18+ 
- Cloudflare Wrangler CLI
- A Cloudflare account with Durable Objects enabled
- Riot client installed (for local testing)

For a full list of Python modules used, refer to <api\requirements.txt>.

We recommend creating your own local environment to download the required modules that make running this application
possible.

## Testing Locally

Backend API
```
cd api
pip install -r requirements.txt
python main.py
```

Worker Relay
```
npx wrangler dev
```

Frontend
```
cd frontend
npm install
npm run dev
```

Once in game, you can view your Manifold market for your current game in the front end app. Event logs will be
generated for your viewing convenience. 

## Deployment
0. Push your front end to your Github

Cloudflare Pages deploys from GitHub, so your Next.js project needs to be in a repo.

If you haven’t pushed yet:
```
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/LoL-Betting-Market.git
git push -u origin main
```

1. Deploy Worker Relay

This serves as the middleman, storing information received from the back end api and sending information to the
front end.

```
npx wrangler deploy
```

This requires you to have a Cloudflare account and will ask you for your credentials to sign in.

2. Create a Cloudflare Page

Create a Cloudflare Page in <dash.cloudflare.com> by navigating to the left side menu and clicking Workers & Pages.
Then, click Create Application on the far right-hand corner. Click the bottom link to Get Started with creating a
page. 

![Dashboard Worker & Compute](assets\cloudflare-page.png) 

![Create application menu](assets\create-app.png)

Get started by importing an existing Git repository. If your Github account is linked, then you can just select
the repository (LoL-Betting-Market) if you've cloned it and pushed it to your Github account (see above). 

Cloudflare will ask you for build settings to build the page. In the Framework dropdown, you can select Next.js,
and it will populate the build settings. 

Lastly, since the repository contains other folders, you need to instruct Cloudflare to build the frontend folder
only. To do this, you can go to advanced settings and type frontend as the root folder for your project.

![Expected build settings](assets\build-settings.png)

You can now Save and Deploy.

3. Add environment variables

From your Workers & Pages tab, you will now see a new Page object that you just created in addition to your worker from 
earlier. Click it and go to the Settings tab. Find the Variables and Secrets section and continue to add a variable. Name 
the variable NEXT_PUBLIC_WORKER_URL and input your worker URL into the value section. You can find your worker URL back 
at the Workers & Pages tab on your worker object. Save your environment variable.

![Setting your environment variable](assets\env-variable.png)

Redeploy your page.

## Version History

### 0.0.0
- Introduced the initial user interface, including a dedicated section for displaying the Manifold Market embed
- Implemented core backend functionality to support real‑time communication and market creation workflow

### 0.0.1
- Added match history
- Updated README for Cloudflare deployment

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you’d like to modify or add.
Contact: spacecowboyjo@icloud.com