# Purpose
Display the latest Twitch Streams in Discord intuitively and efficiently for a chosen game and stream title.

Most bots I've seen use a `Notification Event Strategy`, where a Twitch `Stream Changed` event will create a new message in a designated Discord channel:  
![Notification Event Strategy](/media/notification_strategy.png)

Some of the issues with this system are:
- Discord's text channel behavior is to keep the scroll position at the last seen message
  - Visiting the designated notification channel presents old messages
- Video embed consumes a large amount of screen space and useless notification text
  - Information layout is ineffecient and redundant
- Lack of offline notification message
  - State of the stream is not immediately apparant

These issues cause unnecessary inconveniences:
1. Users are forced to scroll down for the latest notification messages
2. Users can only fit a few notification messsages in their text channel window
3. Users have no way of knowing if these streamers listed are still online

# Design Goals
**Efficient Rendering Strategy**  
Reuse a single discord message for intuitive, centralized information.

**Clean Information Layout**  
Less is more; only display textual information about streams. Provide facilities to show application state information.

**Information Synchronization**  
Provide a facility to continually update the stream information without manual intervention.

# Implementation Strategy
The approach for this bot is to use a static interval to update the stream data. Information about the streams will be formatted to provide the most amount of information in the least amount of space possible.

Here are some visuals of a prototype bot featuring the desired functionality:  
![Static Interval Strategy](/media/message_strategy.png)  
![Animated Usage Example GIF](/media/ttvsl_simple_example.gif)

## Technology
This first iteration of the bot is more of a quick prototype to get familiar with the technology. It is not setup, nor intended to simultaneously service multiple guilds. It uses [Discord.js](https://github.com/discordjs/discord.js) for the discord client management. Twitch basic custom API module handles app-level OAuth tokens and has a throttling mechinism to prevent API spam.

### Future Goals
With the low level of complexity, the full Commando framework is going to be overkill. The bot would not scale very well to multiple guilds without proper caching systems due to the limit of API rates. A more modular command struture will be looked at next.

- ~~Add app-level OAuth support~~ Done
- Integrate Discordjs Commando command framework (Maybe)

## Display 
Two sections, **Header** and **Stream List**, make up the display layout. Sections marked with an asterisk can have their visibility changed with a [command](#commands).

### Header Section
|Description|Example|
|---|---|
|Auto Update Info*|✓ AutoUpdate (2h)|
|Game Name*|Diablo II: Lord of Destruction|
|Stream Title Filter*|Filter: median ?(xl)?\|mxl (displaying 3/21)|
|Last Update Time*|Last Update: 2/10/2020 01:06:53 (-0800)|

### Stream List Section  
The stream title is hard coded to a maximum display of 80 characters. Each stream is rendered using the same template below:
|Description|Example|
|---|---|
|Stream URL (& Stream Details*)|<noLink>h</noLink>ttps://twitch.tv/TurdFerguson (1h 39m uptime, 69 viewers)|
|Stream Title|Just casually lvling a sin -  Selffound! - !sellout !uldy - Median XL - We ma...|

## Commands
Commands are prefixed with an exclimation mark (`!`). The `args` column uses parenthesis and pipe characters to indicate a set of inputs that are acceptable. Anything between angled bracket characters (less/greater than) indicates what type of information it accepts.
|Command|args|Example|Descrption|
|---|---|---|---|
|admins|(add\|del) <USER_ID>|`!admin add 123456789`|Add or delete users that can operate the bot (only accepts `user_id`s, no `usernames`)|
|autoupdate|(true\|false)|`!autoupdate true`|Enable or disables the auto stream updates feature|
|channel|<CHANNEL_NAME>|`!channel twitch-streams`|Set the channel for displaying streams (supports '#channel' and 'channel'|
|cmds||`!cmds`|Lists available commands|
|exit||`!exit`|Exits the bot process (This is ~~probably~~ **definitely** bad interface design)|
|game|<GAME_NAME>|`!game Diablo II: Lord of Destruction`|Change the game name for stream searches|
|interval|(\<NUMBER\>(d\|h\|m\|s\|ms))+|`!interval 1h 30m 15s`|Sets the frequency of stream updates|
|listsize|\<NUMBER\>|`!listsize 5`|Sets the number of streams to display|
|purge||`!purge`|Deleted all messages (excluding the display message) in the display channel|
|showautoupdate|(true\|false)|`!showautoupdate true`|Toggles header's auto-update information|
|showfilter|(true\|false)|`!showfilter false`|Toggles header's stream title filter information|
|showgame|(true\|false)|`!showgame true`|Toggles header's game name|
|showlastupdated|(true\|false)|`!showlastupdated false`|Toggles header's last updated information|
|showstreamdetails|(true\|false)|`!showstreamdetails true`|Toggles stream's extra details|
|titlefilter|<REGEX_STRING>|`!filter median ?(xl)?\|mxl`|Set the RegEx string that inclusively filters stream titles (no delimiters or flags)|
|update||`!update`|Manually update the stream list|
