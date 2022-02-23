function getBrowser(userAgent) {
  const ua = new UAParser(userAgent);
  
  let data = {};
  if (ua.getDevice().type === 'mobile' || ua.getDevice().type === 'tablet') {
    data = {
      text: 'Unsupported browser',
      link: ''
    };
  } else {
    switch (ua.getBrowser().name) {
      case 'Chrome':
        data = {
          text: 'Download for Chrome',
          link: 'https://chrome.google.com/webstore/detail/mue/bngmbednanpcfochchhgbkookpiaiaid'
        };
        break;
  
      case 'Firefox':
        data = {
          text: 'Download for Firefox',
          link: 'https://addons.mozilla.org/firefox/addon/mue/'
        };
        break;
  
      case 'Edge':
        data = {
          text: 'Download for Edge',
          link: 'https://microsoftedge.microsoft.com/addons/detail/mue/aepnglgjfokepefimhbnibfjekidhmja'
        };
        break;
  
      case 'Whale':
        data = {
          text: 'Download for Whale',
          link: 'https://store.whale.naver.com/detail/ecllekeilcmicbfkkiknfdddbogibbnc'
        };
        break;
  
      default:
        data = {
          text: 'Download from GitHub',
          link: 'https://github.com/mue/mue/releases'
        };
    }
  }
  
  return data;
}

const downloadLinks = getBrowser(navigator.userAgent);
const addMue = document.getElementById('addMue');
addMue.innerText = downloadLinks.text;
addMue.href = downloadLinks.link;
document.getElementById('itemButton').href = downloadLinks.link;
