(function(global){'use strict';
// English-only interface. Maps any remaining stored Spanish values (statuses,
// roles, legacy data) to English using the catalog exposed by app.js.
function dict(){return global.EDDInlineEnglish||{};}
function translateText(text){const s=String(text==null?'':text);const d=dict();return d[s]||d[s.trim()]||s;}
const api={getLang:()=> 'en',setLang:()=> 'en',translateText,applyTranslations:()=>{document.documentElement.lang='en';}};
global.EDDI18N=api;})(window);
