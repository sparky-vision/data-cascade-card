# data-cascade-card
A data cascade element for HA-LCARS

https://github.com/user-attachments/assets/a6cbb31f-1e76-448e-afd8-07e2270983b8

Well well nerds, who would have expected I would EVER be able to do anything like this? Nobody, that's who.

In Star Trek, the various LCARS displays often have a "data cascade" to the left of the upper-right buttons. On the show, this cascade was just random numbers because SD was the broadcast television standard at the time and nobody could read what the text said, so why bother coming up with interesting things? However, on a starship, random numbers would not be very useful, so in-universe, it seems likely that these were actually something like a realtime status update or log outputs of various systems to help with troubleshooting, or crew movements, or even more likely, dynamically-generated information that would be relevant to the user of the console. (B'Lanna's engineering displays would show her various subsystem outputs, Picard's console would show overall ships systems and damage reports, Worf's would be a running update of tactical systems, and so forth)

Anyway, I use the amazing [HA-LCARS](https://github.com/th3jesta/ha-lcars) and [CB-LCARS](https://github.com/snootched/cb-lcars) but neither have a data cascade card that allows you to put in your own sensors or jinja and get useful cascades. That's where my card comes in. It does that. You can add your own sensors, or you can put in a Jinja2 template. Later versions will use a flexbox so you can spread information out into a square for an experience closer to the original design of LCARS. By the way, that story is really cool and if you're interested in graphic design and Trek and its history, you should read up on it. There's a great [series of articles here](https://wrathofdhanprops.blogspot.com/2018/06/okudagrams-part-1-how-one-man-designed.html).

Installation via HACS

Add the repository as a Custom repository in HACS → Frontend.

Install the "Data Cascade Card".

```
type: 'custom:data-cascade-card'
```
Oh, I should say. This is intended to be used with ha-lcars, here: https://github.com/th3jesta/ha-lcars

And it will look odd without a class applied, such as middle-blank or something like that.
