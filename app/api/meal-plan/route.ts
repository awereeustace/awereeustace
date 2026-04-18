import { NextRequest, NextResponse } from "next/server";
import { scrapeCoupons } from "@/lib/scraper";
import { buildMealPlan } from "@/lib/mealPlanner";
import { getMealPlanNarrative } from "@/lib/ai";
import type { MenuItem } from "@/lib/mealPlanner";

// Full mock menu — in production this comes from a DB / food API
const MENU: MenuItem[] = [
  { id:"1",  name:"Classic Cheeseburger",      vendor:"Patty Palace",  cuisine:["American","Burgers"],    basePrice:6.99, estFeesTax:1.20, pickupAvailable:true,  coupons:[], distanceMi:1.2 },
  { id:"2",  name:"Double Smash Burger",        vendor:"Patty Palace",  cuisine:["American","Burgers"],    basePrice:9.49, estFeesTax:1.50, pickupAvailable:true,  coupons:[], distanceMi:1.2 },
  { id:"3",  name:"Grilled Chicken Club",       vendor:"Toasty Town",   cuisine:["American","Sandwiches"], basePrice:4.75, estFeesTax:0.75, pickupAvailable:true,  coupons:[], distanceMi:0.6 },
  { id:"4",  name:"Italian Sub",                vendor:"Sub Station",   cuisine:["Sandwiches"],            basePrice:5.49, estFeesTax:0.80, pickupAvailable:true,  coupons:[], distanceMi:0.9 },
  { id:"5",  name:"Pepperoni Pizza (12\")",     vendor:"Pizza Planet",  cuisine:["Pizza","Italian"],       basePrice:10.99,estFeesTax:1.80, pickupAvailable:true,  coupons:[], distanceMi:2.1 },
  { id:"6",  name:"BBQ Chicken Pizza",          vendor:"Pizza Planet",  cuisine:["Pizza"],                 basePrice:11.49,estFeesTax:1.90, pickupAvailable:true,  coupons:[], distanceMi:2.1 },
  { id:"7",  name:"Classic Burger Combo",       vendor:"Burger World",  cuisine:["American","Burgers"],    basePrice:7.99, estFeesTax:1.30, pickupAvailable:true,  coupons:[], distanceMi:1.8 },
  { id:"8",  name:"3-Piece Fried Chicken",      vendor:"Cluckers",      cuisine:["Chicken","American"],    basePrice:6.49, estFeesTax:1.00, pickupAvailable:true,  coupons:[], distanceMi:1.5 },
  { id:"9",  name:"Chicken Burrito Bowl",       vendor:"Nacho Mama's",  cuisine:["Mexican","Tex-Mex"],     basePrice:8.49, estFeesTax:1.40, pickupAvailable:false, coupons:[], distanceMi:3.0 },
  { id:"10", name:"Street Tacos (3-pack)",      vendor:"Taco Fiesta",   cuisine:["Mexican","Tacos"],       basePrice:5.99, estFeesTax:0.90, pickupAvailable:true,  coupons:[], distanceMi:2.4 },
  { id:"11", name:"Pad Thai",                   vendor:"Dragon Wok",    cuisine:["Asian","Thai"],          basePrice:9.99, estFeesTax:1.60, pickupAvailable:false, coupons:[], distanceMi:4.2 },
  { id:"12", name:"Kung Pao Chicken",           vendor:"Dragon Wok",    cuisine:["Asian","Chinese"],       basePrice:10.49,estFeesTax:1.70, pickupAvailable:false, coupons:[], distanceMi:4.2 },
  { id:"13", name:"Turkey Avocado Sandwich",    vendor:"Bread & Co.",   cuisine:["Sandwiches","Healthy"],  basePrice:7.49, estFeesTax:1.20, pickupAvailable:true,  coupons:[], distanceMi:0.8 },
  { id:"14", name:"Chicken Noodle Soup + Roll", vendor:"Bread & Co.",   cuisine:["Soup","Healthy"],        basePrice:6.29, estFeesTax:0.95, pickupAvailable:true,  coupons:[], distanceMi:0.8 },
  { id:"15", name:"Buffalo Chicken Wrap",       vendor:"Toasty Town",   cuisine:["American","Wraps"],      basePrice:5.99, estFeesTax:0.90, pickupAvailable:true,  coupons:[], distanceMi:0.6 },
];

export async function POST(req: NextRequest) {
  try {
    const { weeklyBudget = 40, days = 5, cuisineFilter = [] } = await req.json() as {
      weeklyBudget?: number; days?: number; cuisineFilter?: string[];
    };

    // Filter menu by cuisine if provided
    const filtered = cuisineFilter.length
      ? MENU.filter(m => cuisineFilter.some(c => m.cuisine.some(mc => mc.toLowerCase().includes(c.toLowerCase()))))
      : MENU;

    // Scrape coupons for all unique vendors in parallel
    const vendors   = [...new Set(filtered.map(m => m.vendor))];
    const couponMap = new Map<string, Awaited<ReturnType<typeof scrapeCoupons>>>();
    await Promise.all(vendors.map(async v => { couponMap.set(v, await scrapeCoupons(v)); }));

    const plan = buildMealPlan(filtered, couponMap, weeklyBudget, days);
    const narrative = await getMealPlanNarrative(weeklyBudget, plan.meals.map(m => ({
      name: m.item.name,
      vendor: m.item.vendor,
      adjustedPrice: m.adjustedPrice,
      bestCouponLabel: m.bestCoupon?.label ?? null,
      savings: m.savings,
    })));

    return NextResponse.json({ plan, narrative, totalMenuItems: filtered.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
