import { defineSceneRows, placeActorSceneKeys } from './scene-rows'
export const cityPharmacyScenes = defineSceneRows(placeActorSceneKeys, [
  ["clan","yan","walk-together","实际开始族内同行","晨间交卡后，本人与薰儿一起沿族内路段前行。原有邀约不代签已经离族。","本人开始族内同行"],
  ["clan","observer","notice-clansmen","沿途族人的招呼与目光","两人交谈时遇见族人。旁人反应仅记此时观察，不发关系积分。","记录沿途族人反应"],
  ["gate","yan","continue-outing","本人继续原定同行","本人没有因旁人目光中止这次同行，继续走向族门。","本人继续走向族门"],
  ["gate","yan","leave-clan","实际离开家族","本人走到族门后，与薰儿一起离族。入城街道另一步保存。","本人从族门离族"],
  ["street","observer","observe-city","进入城中街道","城中人流繁忙。街道比例和摊位布局为原创，不是原著精确地图。","记录实际入城街道"],
  ["stalls","xuner","visit-stalls","薰儿带着同行逛摊","薰儿在城里带着本人看不同摊位。这里只回顾同行，不产生未付账商品。","随薰儿逛街边摊位"],
  ["stalls","observer","pause-outing","逛摊后再去药铺","两人逛过摊位后停下来，再往药铺走。此时还没有药草订单。","记录逛摊结束"],
  ["pharmacy","yan","enter-pharmacy","本人实际走进药铺","本人带薰儿到药铺，准备购买老师要求的两种药草。木核采购仍在后段。","本人走近药铺入店"],
  ["pharmacy","observer","inspect-primary","主药数量与年份","核对准备单所需的三株主药与二十年年份。要求核对后，另一步核实际订单。","核主药三株与二十年历史"],
  ["pharmacy","observer","inspect-auxiliary","辅药数量与年份","核对准备单所需的两株辅药与五年年份。年份说明不再发一份材料或替代已购收据。","核辅药两株与五年历史"],
  ["pharmacy","yan","purchase-primary","主药同一笔订单","未买主药则通过原30折算采购交易交付三株；旧主药已购或已用只核历史，不重复扣款或恢复库存。","核主药订单 · 唯一30与原收据"],
  ["pharmacy","yan","purchase-auxiliary","辅药同一笔订单","未买辅药则通过原20折算采购交易交付两株；旧已购或已用只核历史。两药各自收据分开。","核辅药订单 · 唯一20与原收据"],
  ["pharmacy","yan","review-expense","两药备齐后回看花费","本人回顾采购花费。游戏沿30与20账，不再扣原著900或制造一份历史收据。","本人核两药花费 · 不另扣900"],
  ["pharmacy","observer","note-wood-pending","历史此时尚待木属性魔核","原本这次药铺只买齐两种草药，尚需一阶木核。旧玩家已经取得木核或成药时，保留其实际进度，只补当时历史。","记药铺只备两药 · 木核后段"],
  ["pharmacy","observer","archive","同行与药铺归档","族内、离族、入城、逛摊与药铺两药分别留存。这里不代签坊市木核、黑铁片或调制。","归档同行药铺 · 坊市待接续"]
] as const)
