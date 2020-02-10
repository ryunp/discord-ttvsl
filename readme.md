# Purpose
Display the latest Twitch Streams in Discord intuitively and efficiently for a given game name and stream title contents.

![Discord Display Example](/media/discord_display_example.png)

# Features
Most details of the following features are configurable during runtime.

**Efficient Rendering Strategy**  
The display strategy chosen is rendering text to a single, reused message. This keeps the discord servers happy, as well as our brains, due to less data overhead.

**Clean Design**  
Less is more. The display layout allows most of the sections to be toggled on/off.

**Auto Updates**  
The auto update system provides set and forget mentality.

**It Actually Feels Good Man**  
I often miss the functionality when taking it down during debugging. :crying:

# Display 
Two sections, **Header** and **Stream List**, make up the display layout. Sections marked with an asterisk can have their visibility changed with a [command](#commands).

## Header Section
|Description|Example|
|---|---|
|Auto Update Info*|✓ AutoUpdate (2h)|
|Game Name*|Diablo II: Lord of Destruction|
|Stream Title Filter*|Filter: median ?(xl)?|mxl (displaying 3/21)|
|Last Update Time*|Last Update: 2/10/2020 01:06:53 (-0800)|

## Stream List Section  
The stream title is hard coded to a maximum display of 80 characters. Each stream is rendered using the same template below:
|Description|Example|
|---|---|
|Stream URL (& Stream Details*)|https://twitch.tv/TurdFerguson (1h 39m uptime, 69 viewers)|
|Stream Title|Just casually lvling a sin -  Selffound! - !sellout !uldy - Median XL - We ma...|

# Commands
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
|titlefilter|<REGEX_STRING>|`!filter median ?(xl)?|mxl`|Set the RegEx string that inclusively filters stream titles (no delimiters or flags)|
|update||`!update`|Manually update the stream list|

# Contributors
ryunp, Status Code 429
