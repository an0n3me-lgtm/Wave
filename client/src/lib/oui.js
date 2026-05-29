/**
 * OUI → manufacturer lookup (mobile-focused subset).
 * Key: first 6 hex chars of MAC, uppercase, no separators.
 */
const OUI = {
  // ── Samsung ────────────────────────────────────────────────────────────
  '000732':'Samsung','0007AB':'Samsung','001247':'Samsung','001599':'Samsung',
  '00166B':'Samsung','001632':'Samsung','001C43':'Samsung','001DF6':'Samsung',
  '0021D1':'Samsung','002339':'Samsung','002454':'Samsung','0025DD':'Samsung',
  '0026E6':'Samsung','002778':'Samsung','0028E3':'Samsung','002A5D':'Samsung',
  '0051CD':'Samsung','00718D':'Samsung','009EC8':'Samsung','001C62':'Samsung',
  '286C07':'Samsung','38AA3C':'Samsung','3C28B6':'Samsung','40D3AE':'Samsung',
  '44E92F':'Samsung','48135A':'Samsung','4C2D96':'Samsung','5038FD':'Samsung',
  '54880E':'Samsung','5C0AEA':'Samsung','600F80':'Samsung','6425E8':'Samsung',
  '685E1C':'Samsung','6C2F2C':'Samsung','70F927':'Samsung','78295E':'Samsung',
  '7C1DD9':'Samsung','8018A7':'Samsung','84119E':'Samsung','884A46':'Samsung',
  '8C77120':'Samsung','9401C2':'Samsung','9807B5':'Samsung','9C2A83':'Samsung',
  'A4070B':'Samsung','A85E45':'Samsung','AC3613':'Samsung','B47443':'Samsung',
  'B87850':'Samsung','B8A386':'Samsung','BC2028':'Samsung','C01173':'Samsung',
  'C05627':'Samsung','C44BE9':'Samsung','CC07AB':'Samsung','D0176A':'Samsung',
  'D4AE05':'Samsung','D802B6':'Samsung','DC7144':'Samsung','E40ECF':'Samsung',
  'E8D2D1':'Samsung','EC1F72':'Samsung','ECAAB4':'Samsung','F025B7':'Samsung',
  'F06BCA':'Samsung','F07D68':'Samsung','F44B32':'Samsung','F8042E':'Samsung',
  'FC00A2':'Samsung','FCA96D':'Samsung',
  // ── Xiaomi ─────────────────────────────────────────────────────────────
  '002896':'Xiaomi','0CFE45':'Xiaomi','14F65A':'Xiaomi','18598B':'Xiaomi',
  '2001F5':'Xiaomi','28E31F':'Xiaomi','34CE00':'Xiaomi','3C9872':'Xiaomi',
  '50EC50':'Xiaomi','5C5484':'Xiaomi','64B473':'Xiaomi','64CC2E':'Xiaomi',
  '6C5CB1':'Xiaomi','74230E':'Xiaomi','74512B':'Xiaomi','78DBCA':'Xiaomi',
  '8CBEEE':'Xiaomi','9C99A0':'Xiaomi','A086C6':'Xiaomi','A0B4A5':'Xiaomi',
  'AC37435':'Xiaomi','B04F13':'Xiaomi','C46AB7':'Xiaomi','C89B40':'Xiaomi',
  'D0C1D2':'Xiaomi','D4970B':'Xiaomi','E29D3D':'Xiaomi','EC637B':'Xiaomi',
  'F48B32':'Xiaomi','F8A45F':'Xiaomi','FC64BA':'Xiaomi',
  // ── Apple ──────────────────────────────────────────────────────────────
  '000393':'Apple','000A27':'Apple','000D93':'Apple','001124':'Apple',
  '001451':'Apple','001CB3':'Apple','001E52':'Apple','001FF3':'Apple',
  '0021E9':'Apple','002312':'Apple','002332':'Apple','002436':'Apple',
  '0025BC':'Apple','0026BB':'Apple','0026B9':'Apple','003065':'Apple',
  '040CCE':'Apple','040E3C':'Apple','04484F':'Apple','04F7E4':'Apple',
  '0C1539':'Apple','0C3E9F':'Apple','0C77AC':'Apple','10DDC5':'Apple',
  '18AF61':'Apple','1C91BE':'Apple','20A2E4':'Apple','24A074':'Apple',
  '28E02C':'Apple','2C1F23':'Apple','30103F':'Apple','34C059':'Apple',
  '3C2EFF':'Apple','3C7D0A':'Apple','404D7F':'Apple','44D884':'Apple',
  '488726':'Apple','4860BC':'Apple','50BC96':'Apple','5404A6':'Apple',
  '606944':'Apple','6465E5':'Apple','686040':'Apple','6C3E6D':'Apple',
  '6CA86B':'Apple','6CD60A':'Apple','706F81':'Apple','78D75F':'Apple',
  '7C04D0':'Apple','7CB9D1':'Apple','7CF05F':'Apple','7CE9D3':'Apple',
  '84789C':'Apple','880066':'Apple','8C0005':'Apple','8C7B9D':'Apple',
  '907240':'Apple','98001A':'Apple','98B8E3':'Apple','9C293F':'Apple',
  'A08695':'Apple','A4C361':'Apple','A82066':'Apple','AC3C0B':'Apple',
  'B0F480':'Apple','B4F0AB':'Apple','B8782E':'Apple','BC92EB':'Apple',
  'BCF5AC':'Apple','C42C03':'Apple','C8334B':'Apple','C8BCC8':'Apple',
  'CC25EF':'Apple','D8A25E':'Apple','D8BB2C':'Apple','DCA904':'Apple',
  'E02141':'Apple','E0C767':'Apple','E4258A':'Apple','E81963':'Apple',
  'E89958':'Apple','EC35F7':'Apple','ECAD08':'Apple','F0B479':'Apple',
  'F0DCE2':'Apple','F401C8':'Apple','F40F43':'Apple','F82793':'Apple',
  'F8BFDF':'Apple','FC253F':'Apple','FCFC48':'Apple',
  // ── Huawei ─────────────────────────────────────────────────────────────
  '001882':'Huawei','009ACD':'Huawei','0C45BA':'Huawei','1047E7':'Huawei',
  '103091':'Huawei','1480F5':'Huawei','18CF5E':'Huawei','203EB9':'Huawei',
  '28316A':'Huawei','2C7531':'Huawei','2CD9EB':'Huawei','3437A7':'Huawei',
  '38BC01':'Huawei','3CDC91':'Huawei','40CB04':'Huawei','44C346':'Huawei',
  '484D7E':'Huawei','48FD8E':'Huawei','4C54DE':'Huawei','4CEBD3':'Huawei',
  '5040B8':'Huawei','507B9D':'Huawei','5404B6':'Huawei','5441AC':'Huawei',
  '547F54':'Huawei','587A62':'Huawei','5C7D5E':'Huawei','5CB09A':'Huawei',
  '6016F0':'Huawei','609C9F':'Huawei','60DEF4':'Huawei','645001':'Huawei',
  '645179':'Huawei','68A0F6':'Huawei','6CF373':'Huawei','706655':'Huawei',
  '74D02B':'Huawei','7C1CF1':'Huawei','7C60B7':'Huawei','80717A':'Huawei',
  '88E3AB':'Huawei','9087B0':'Huawei','90E7C4':'Huawei','90FCBC':'Huawei',
  '941C91':'Huawei','982E51':'Huawei','9C741A':'Huawei','A0870B':'Huawei',
  'A88195':'Huawei','AC6104':'Huawei','B0E5ED':'Huawei','B43052':'Huawei',
  'B4C4FC':'Huawei','B8BC1B':'Huawei','C8C59E':'Huawei','CC96E9':'Huawei',
  'D0FF98':'Huawei','D44290':'Huawei','D4613F':'Huawei','D87895':'Huawei',
  'E4FD45':'Huawei','E891E1':'Huawei','EC38D3':'Huawei','F44CD7':'Huawei',
  'F4BD9E':'Huawei','F80113':'Huawei','FC4817':'Huawei',
  // ── OPPO / OnePlus / Realme ────────────────────────────────────────────
  '00195E':'OPPO','0028F1':'OPPO','04D9F5':'OPPO','0CE6D3':'OPPO',
  '18A691':'OPPO','1C5B75':'OPPO','2CC260':'OPPO','38B5DB':'OnePlus',
  '5C5154':'OPPO','6CC9AB':'OPPO','78396D':'OPPO','8038AC':'OPPO',
  '849FB5':'OPPO','8C0D76':'OPPO','9C28F3':'OPPO','A4508C':'OPPO',
  'A86B75':'OPPO','AC1BEB':'OPPO','B4A459':'OPPO','B8E856':'OPPO',
  'BC9FEF':'OPPO','C4A366':'OPPO','C4F891':'OnePlus','C88B72':'OPPO',
  'EC41E1':'OPPO','F4EFCE':'OPPO','FC0FEB':'OPPO',
  // ── Vivo ───────────────────────────────────────────────────────────────
  '0C12AC':'Vivo','18CF27':'Vivo','1C77F6':'Vivo','282696':'Vivo',
  '2C8AD1':'Vivo','38D547':'Vivo','48A27F':'Vivo','4CE17D':'Vivo',
  '5C5648':'Vivo','68DBCA':'Vivo','88B4A6':'Vivo','9C7BD2':'Vivo',
  'C02EB7':'Vivo','E0E97A':'Vivo','E4A7C5':'Vivo',
  // ── Google / Pixel ─────────────────────────────────────────────────────
  '001A11':'Google','3432C9':'Google','546009':'Google','6C40B2':'Google',
  'F88FCA':'Google','009B50':'Google','10BF48':'Google','1402EC':'Google',
  '40B283':'Google','48D705':'Google','50DC0B':'Google','6CBF2F':'Google',
  '70F350':'Google','782B46':'Google','86E9AE':'Google','A47733':'Google',
  'A4C138':'Google','BCCEFA':'Google','E4A3EF':'Google',
  // ── Sony ───────────────────────────────────────────────────────────────
  '001A80':'Sony','001EE1':'Sony','002008':'Sony','0025E7':'Sony',
  '4897FC':'Sony','54A057':'Sony','58596F':'Sony','78843C':'Sony',
  '88C9D0':'Sony','9CD917':'Sony','A0E9DB':'Sony','AC233F':'Sony',
  'B47C9C':'Sony','C862EA':'Sony','D0BCE1':'Sony','F0793A':'Sony',
  // ── LG ─────────────────────────────────────────────────────────────────
  '001C62':'LG','001E75':'LG','0021FB':'LG','00261E':'LG',
  '2C54CF':'LG','40B0FA':'LG','5014B5':'LG','6CF8E4':'LG',
  '74C246':'LG','7C6671':'LG','805A04':'LG','8C3AE3':'LG',
  '94E97E':'LG','9839D8':'LG','A8B8E0':'LG','B4EEB0':'LG',
  'CC2D8C':'LG','D858D7':'LG','E89A8F':'LG','FC1D9F':'LG',
  // ── Motorola ───────────────────────────────────────────────────────────
  '000A28':'Motorola','000EAE':'Motorola','001374':'Motorola','001A1E':'Motorola',
  '00223B':'Motorola','003A99':'Motorola','04B157':'Motorola','08003E':'Motorola',
  '2CB9B0':'Motorola','2CEA7F':'Motorola','34BB1F':'Motorola','388D95':'Motorola',
  '3C4F5A':'Motorola','3CE575':'Motorola','48A90F':'Motorola','4CECDF':'Motorola',
  '5C51F7':'Motorola','64A351':'Motorola','80C5F2':'Motorola','9C6CA1':'Motorola',
  'A47791':'Motorola','A4DB30':'Motorola','CC5DE4':'Motorola','D8179E':'Motorola',
  // ── Nokia ──────────────────────────────────────────────────────────────
  '000E6D':'Nokia','001E97':'Nokia','0025D0':'Nokia','00606E':'Nokia',
  '7C777D':'Nokia','8C1F64':'Nokia','A08C15':'Nokia','B0CF87':'Nokia',
};

const ICONS = {
  Samsung:'🟦', Apple:'🍎', Xiaomi:'🔴', Huawei:'🌸', OPPO:'🟢',
  OnePlus:'🔴', Realme:'🟡', Vivo:'🟣', Google:'🔵', Sony:'⚫',
  LG:'🔵', Motorola:'🟠', Nokia:'🔵',
};

/**
 * @param {string} mac - e.g. "AA:BB:CC:DD:EE:FF" or "AABBCCDDEEFF"
 * @returns {{ brand: string, icon: string }}
 */
export function lookupOUI(mac) {
  if (!mac) return { brand: 'Unknown', icon: '📱' };
  const clean = mac.replace(/[^0-9A-Fa-f]/g, '').toUpperCase().slice(0, 6);
  const brand = OUI[clean] || null;
  if (brand) return { brand, icon: ICONS[brand] || '📱' };
  // Try prefix match (some OUI tables use 7-char keys by mistake)
  const prefix5 = clean.slice(0, 5);
  for (const key of Object.keys(OUI)) {
    if (key.startsWith(prefix5)) return { brand: OUI[key], icon: ICONS[OUI[key]] || '📱' };
  }
  return { brand: 'Unknown', icon: '📱' };
}
