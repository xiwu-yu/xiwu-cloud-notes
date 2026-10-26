// 同一设置面板模板用于首页和独立文章；文案来自 content/ui.json。
const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function appearancePanel(ui) {
  const text = key => `<span data-i18n="appearance.${key}">${escape(ui[`appearance.${key}`])}</span>`;
  return `<dialog id="glass-settings" class="glass-settings glass-surface" data-material="content" aria-labelledby="glass-settings-title">
  <div class="glass-settings-heading"><h2 id="glass-settings-title">${text('open')}</h2><button id="glass-settings-close" class="settings-close" type="button" aria-label="${escape(ui['appearance.close'])}" data-i18n-aria-label="appearance.close"><span aria-hidden="true">×</span></button></div>
  <label class="glass-enable-row" for="glass-enabled">${text('enabled')}<input id="glass-enabled" type="checkbox" role="switch"></label>
  <div id="glass-adjustments">
    <div class="glass-range-label"><label for="glass-clarity">${text('clarity')}</label><output id="glass-clarity-value" for="glass-clarity">55</output></div>
    <input id="glass-clarity" type="range" min="0" max="100" step="1" value="55" aria-describedby="glass-range-hint">
    <p id="glass-range-hint" class="settings-hint">${text('rangeHint')}</p>
    <div class="glass-presets" role="group" aria-label="${escape(ui['appearance.presets'])}" data-i18n-aria-label="appearance.presets">${[['soft',20],['balanced',55],['clear',90]].map(([key,value]) => `<button type="button" data-glass-preset="${value}" aria-pressed="false">${text(key)}</button>`).join('')}</div>
  </div>
  <div class="glass-effective" role="status" aria-live="polite">${['auto','off','system','contrast','forced','unsupported'].map(reason => `<p data-glass-reason="${reason}"${reason === 'auto' ? '' : ' hidden'}>${text(`status.${reason}`)}</p>`).join('')}</div>
  <button id="glass-reset" class="settings-reset" type="button">${text('reset')}</button>
</dialog>`;
}
