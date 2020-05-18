/* eslent-env node */
/* global xelib, registerPatcher, patcherUrl, info */

registerPatcher({
  info: info,
  gameModes: [xelib.gmFO4],
  settings: {
    label: 'No Lowered Suppressor And Bayonet Range',
    templateUrl: `${patcherUrl}/partials/settings.html`,
    defaultSettings: {
      patchFileName: 'zPatch.esp'
    }
  },
  execute: (patchFile, helpers, settings, locals) => ({
    initialize: function () {
      var baseFile = xelib.FileByName('Fallout4.esm')

      var keywords = xelib.GetElement(baseFile, 'KYWD')

      locals.filterKeywordFormIDs = new Set([
        'AnimsBayonet',
        'dn_HasMuzzle_Bayonet',
        'dn_HasMuzzle_Compensator',
        'dn_HasMuzzle_MuzzleBreak',
        'dn_HasMuzzle_Suppressor',
        'HasSilencer',
        's_20_Silenced'
      ].map(keywordName => xelib.GetElement(keywords, keywordName)).map(record => xelib.GetValue(record, 'Record Header\\FormID')))
    },
    process: [
      {
        load: {
          signature: 'OMOD',
          filter: function (record) {
            if (!xelib.IsWinningOverride(record)) return false

            // probably can't happen, but paranoia suggests it might.
            if (!xelib.HasElement(record, 'DATA')) return false

            if (xelib.GetValue(record, 'DATA\\Form Type') !== 'Weapon') return false

            return xelib.GetElements(record, 'DATA - Data\\Properties').some(
              function (property) {
                if (xelib.GetValue(property, 'Property') !== 'Keywords') return
                if (xelib.GetValue(property, 'Value Type') !== 'FormID,Int') return
                if (xelib.GetValue(property, 'Function Type') !== 'ADD') return
                return locals.filterKeywordFormIDs.has(xelib.GetValue(property, 'Value 1'))
              }
            )
          }
        },
        patch: function (record) {
          helpers.logMessage(`Patching ${xelib.LongName(record)}`)

          var victimFunctionTypes = new Set(['MUL+ADD', 'ADD'])
          var victimProperties = new Set(['MinRange', 'MaxRange'])

          // I boldly assume no Suppressor, Muzzle Brake, Recoil Compensator or Bayonet is going to _increase_ range.
          xelib.GetElements(record, 'DATA - Data\\Properties')
            .reverse()
            .filter(property => victimProperties.has(xelib.GetValue(property, 'Property')))
            .filter(property => xelib.GetValue(property, 'Value Type') === 'Float')
            .filter(property => victimFunctionTypes.has(xelib.GetValue(property, 'Function Type')))
            .forEach(property => xelib.RemoveElement(property))
        }
      }
    ]
  })
})
