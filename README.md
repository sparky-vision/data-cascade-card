# data-cascade-card
A data cascade element for HA-LCARS

https://github.com/user-attachments/assets/a6cbb31f-1e76-448e-afd8-07e2270983b8

Well well nerds, who would have expected I would EVER be able to do anything like this? Nobody, that's who.

I've wanted an element that could do the LCARS "data cascade" for a while, but have it display actually-useful information, like the states of various entities from Home Assistant. So, I made my own.

Installation via HACS

Add the repository as a Custom repository in HACS → Frontend.

Install the "Data Cascade Card".

Add the following resource to your Lovelace config:

```
resources:
  - url: /hacsfiles/data-cascade-card/data-cascade-card.js
    type: module
```
Use the card in your Lovelace UI as:

```
type: 'custom:data-cascade-card'
```
Oh, I should say. This is intended to be used with ha-lcars, here: https://github.com/th3jesta/ha-lcars

And it will look odd without a class applied, such as middle-blank or something like that.
