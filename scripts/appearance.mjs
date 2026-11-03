// 同一设置面板模板用于首页和独立文章；文案来自 content/ui.json。
const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const settingsIcon = '<svg class="settings-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.8 3.2h4.4l.6 2.3 1.8 1 2.3-.6 2.2 3.8-1.7 1.7v2l1.7 1.7-2.2 3.8-2.3-.6-1.8 1-.6 2.3H9.8l-.6-2.3-1.8-1-2.3.6-2.2-3.8 1.7-1.7v-2L2.9 9.7l2.2-3.8 2.3.6 1.8-1Z"/><circle cx="12" cy="12.4" r="3"/></svg>';
export function appearancePanel(ui) {
  const text = key => `<span data-i18n="appearance.${key}">${escape(ui[`appearance.${key}`])}</span>`;
  return `<dialog id="glass-settings" class="glass-settings glass-surface" data-material="content" aria-labelledby="glass-settings-title">
  <div class="glass-settings-heading"><h2 id="glass-settings-title">${text('open')}</h2><button id="glass-settings-close" class="settings-close" type="button" aria-label="${escape(ui['appearance.close'])}" data-i18n-aria-label="appearance.close"><span aria-hidden="true">×</span></button></div>
  <div class="settings-sections">
  <div class="settings-section theme-setting"><p id="theme-mode-label" class="settings-section-title" data-i18n="theme.label">${escape(ui['theme.label'])}</p><div id="theme-choice" class="settings-choice theme-choices" role="group" aria-labelledby="theme-mode-label" aria-describedby="theme-hint">${['system','light','dark'].map(mode => `<button type="button" data-theme-option="${mode}" aria-pressed="${mode==='system'}" aria-label="${escape(ui[`theme.${mode}`])}" title="${escape(ui[`theme.${mode}`])}" data-i18n-aria-label="theme.${mode}" data-i18n-title="theme.${mode}"><span data-i18n="theme.choice.${mode}">${escape(ui[`theme.choice.${mode}`])}</span></button>`).join('')}</div><p id="theme-hint" class="settings-hint" data-i18n="theme.hint">${escape(ui['theme.hint'])}</p></div>
  <section class="settings-section glass-setting" aria-labelledby="glass-section-title">
  <label class="glass-enable-row" for="glass-enabled"><span id="glass-section-title">${text('enabled')}</span><input id="glass-enabled" type="checkbox" role="switch" aria-controls="glass-adjustments" aria-expanded="true"></label>
  <div id="glass-adjustments"><div class="glass-adjustments-content">
    <div class="glass-range-label"><label for="glass-clarity">${text('clarity')}</label><output id="glass-clarity-value" for="glass-clarity">55</output></div>
    <input id="glass-clarity" type="range" min="0" max="100" step="1" value="55" aria-describedby="glass-range-hint">
    <p id="glass-range-hint" class="settings-hint">${text('rangeHint')}</p>
    <div class="settings-choice glass-presets" role="group" aria-label="${escape(ui['appearance.presets'])}" data-i18n-aria-label="appearance.presets">${[['soft',20],['balanced',55],['clear',90]].map(([key,value]) => `<button type="button" data-glass-preset="${value}" aria-pressed="false">${text(key)}</button>`).join('')}</div>
  </div>
  </div>
  <div class="glass-effective" role="status" aria-live="polite">${['auto','off','system','contrast','forced','unsupported'].map(reason => `<p data-glass-reason="${reason}"${reason === 'auto' ? '' : ' hidden'}>${text(`status.${reason}`)}</p>`).join('')}</div>
  <button id="glass-reset" class="settings-reset" type="button">${text('reset')}</button>
  </section>
  </div>
</dialog>`;
}
