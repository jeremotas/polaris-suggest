'use babel';

import PolarisSuggestView from './polaris-suggest-view';
import { CompositeDisposable } from 'atom';
import request from 'request'

export default {

  polarisSuggestView: null,
  modalPanel: null,
  subscriptions: null,
  currentTooltip: null,
  config: {
    urlxdoc: {
      title: 'URL to xdoc in Object Constructor',
      description: 'URL to access the xdoc script for searching information inside the framework (without xdoc.php?search= string).',
      type: "string",
      default: "https://127.0.0.1/objectconstructor/"
    }
  },

  activate(state) {
    this.polarisSuggestView = new PolarisSuggestView(state.polarisSuggestViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.polarisSuggestView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'polaris-suggest:fetch': () => this.fetch()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.polarisSuggestView.destroy();
  },

  serialize() {
    return {
      polarisSuggestViewState: this.polarisSuggestView.serialize()
    };
  },

  download(url) {
    return new Promise((resolve, reject) => {
      request({url: url, agentOptions: {rejectUnauthorized: false}}, (error, response, body) => {
        if (!error && response.statusCode == 200) {
          resolve(body)
        } else {
          reject({
            reason: 'Unable to download page',
            error: error
          })
        }
      })
    })
  },

  fetch() {
    let editor
    if (editor = atom.workspace.getActiveTextEditor()) {
      let selection = editor.getSelectedText();
      let urlxdoc = atom.config.get('polaris-suggest.urlxdoc')
      console.log('URL', urlxdoc + 'xdoc.php?search=' + selection)
      this.download(urlxdoc + 'xdoc.php?search=' + selection).then((json) => {
        var aInfo = JSON.parse(json)
        var aFunctionsFounded = Object.keys(aInfo);
        if(aFunctionsFounded.length == 1 || typeof aInfo[selection] == 'object') {
          var sProperty = ''
          if (aFunctionsFounded.length == 1) sProperty = aFunctionsFounded[0]
          else sProperty = selection
          var sParameters = '';
          for(var i = 0; i < aInfo[sProperty].parameters.length; i++) {
            sParameters += '<b>' + aInfo[sProperty].parameters[i] + '</b>, ';
          }
          sParameters = sParameters.substr(0, sParameters.length - 2);
          var sMessage = 'Evento: <b>' + aInfo[sProperty].seclog_call + '</b><br>' +
            'Parametros:' +
              '[' + sParameters + ']<br>' +
            'Interprete: ' + aInfo[sProperty].file + '<br>' +
            'Funcion (en man): ' + aInfo[sProperty].function_in_man + '<br>' +
            ''
          atom.notifications.addSuccess(sMessage)
        }

      }).catch((error) => {
        console.log(error)
        atom.notifications.addWarning(error.reason)
      })
    }
  }

};
