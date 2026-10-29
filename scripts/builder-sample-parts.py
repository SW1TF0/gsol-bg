#!/usr/bin/env python3
"""
Примерни части за билдъра — докато дойдат истинските от доставчиците (Vali, MOST).
Моделите и снимките на кутиите са от сегашните машини на gsol.bg; доставните цени са ПРИБЛИЗИТЕЛНИ
и измислени — всички части са с is_sample = true и се заменят от вноса на доставчиците.

  python3 scripts/builder-sample-parts.py > /tmp/parts.sql   # SQL за вмъкване
  python3 scripts/builder-sample-parts.py --json             # същото като JSON (за проби на билдъра)
"""
import json
import sys

IMG = "https://gsol.bg/wp-content/uploads/2026/"
INTEL = ["LGA1700"]
ALL_SOCKETS = ["LGA1700", "LGA1851", "AM4", "AM5"]


def cpu(name, brand, socket, cls, cores, tdp, igpu, boxed, memory, year, cost):
    return ("cpu", name, brand, dict(socket=socket, **{"class": cls}, cores=cores, tdp_w=tdp, igpu=igpu,
                                     boxed_cooler=boxed, memory=memory, release_year=year), cost)


def board(name, brand, socket, chipset, tier, mem, ff, cost):
    return ("motherboard", name, brand, dict(socket=socket, chipset=chipset, tier=tier, memory_type=mem, form_factor=ff), cost)


def ram(name, brand, typ, form, gb, mhz, cost):
    return ("ram", name, brand, dict(type=typ, form=form, capacity_gb=gb, speed_mhz=mhz), cost)


def gpu(name, brand, tier, vram, tdp, length, year, current, cost):
    return ("gpu", name, brand, dict(tier=tier, vram_gb=vram, tdp_w=tdp, length_mm=length, release_year=year, current_gen=current), cost)


def disk(name, brand, typ, gb, cost):
    return ("storage", name, brand, dict(type=typ, capacity_gb=gb), cost)


def psu(name, brand, watts, eff, branded, cost):
    return ("psu", name, brand, dict(watts=watts, efficiency=eff, branded=branded), cost)


def box(name, brand, ffs, glass, gpu_mm, cooler_mm, rads, img, cost):
    return ("case", name, brand, dict(form_factors=ffs, glass=glass, max_gpu_mm=gpu_mm, max_cooler_mm=cooler_mm, radiators_mm=rads), cost, img)


def cooler(name, brand, typ, tdp, sockets, cost, height=None, radiator=None):
    specs = dict(type=typ, tdp_w=tdp, sockets=sockets)
    if height:
        specs["height_mm"] = height
    if radiator:
        specs["radiator_mm"] = radiator
    return ("cooler", name, brand, specs, cost)


PARTS = [
    # ---------------- процесори (вградена графика → GSOL Office)
    cpu("Core i3-14100", "Intel", "LGA1700", 3, 4, 60, True, True, ["DDR4", "DDR5"], 2024, 115),
    cpu("Core i5-12400", "Intel", "LGA1700", 5, 6, 65, True, True, ["DDR4", "DDR5"], 2022, 135),
    cpu("Core i5-12600", "Intel", "LGA1700", 5, 6, 65, True, True, ["DDR4", "DDR5"], 2022, 165),
    cpu("Core i5-14400", "Intel", "LGA1700", 5, 10, 65, True, True, ["DDR4", "DDR5"], 2024, 175),
    cpu("Core Ultra 5 225", "Intel", "LGA1851", 5, 10, 65, True, True, ["DDR5"], 2025, 205),
    cpu("Ryzen 5 5600G", "AMD", "AM4", 5, 6, 65, True, True, ["DDR4"], 2021, 105),
    cpu("Ryzen 7 5700G", "AMD", "AM4", 7, 8, 65, True, True, ["DDR4"], 2021, 140),
    cpu("Ryzen 5 Pro 8500G", "AMD", "AM5", 5, 6, 65, True, True, ["DDR5"], 2024, 150),
    cpu("Ryzen 5 8600G", "AMD", "AM5", 5, 6, 65, True, True, ["DDR5"], 2024, 185),
    cpu("Ryzen 7 8700G", "AMD", "AM5", 7, 8, 65, True, True, ["DDR5"], 2024, 255),
    # ---------------- процесори за гейминг
    cpu("Core i3-14100F", "Intel", "LGA1700", 3, 4, 58, False, True, ["DDR4", "DDR5"], 2024, 85),
    cpu("Core i5-12400F", "Intel", "LGA1700", 5, 6, 65, False, True, ["DDR4", "DDR5"], 2022, 100),
    cpu("Core i5-14400F", "Intel", "LGA1700", 5, 10, 65, False, True, ["DDR4", "DDR5"], 2024, 130),
    cpu("Core i5-13600KF", "Intel", "LGA1700", 5, 14, 125, False, False, ["DDR4", "DDR5"], 2022, 190),
    cpu("Core i5-14600KF", "Intel", "LGA1700", 5, 14, 125, False, False, ["DDR4", "DDR5"], 2023, 220),
    cpu("Core Ultra 5 245KF", "Intel", "LGA1851", 5, 14, 125, False, False, ["DDR5"], 2024, 210),
    cpu("Ryzen 5 5600", "AMD", "AM4", 5, 6, 65, False, True, ["DDR4"], 2022, 90),
    cpu("Ryzen 5 8400F", "AMD", "AM5", 5, 6, 65, False, True, ["DDR5"], 2024, 110),
    cpu("Ryzen 5 7500F", "AMD", "AM5", 5, 6, 65, False, True, ["DDR5"], 2023, 130),
    cpu("Ryzen 5 7600", "AMD", "AM5", 5, 6, 65, True, True, ["DDR5"], 2023, 175),
    cpu("Ryzen 5 9600X", "AMD", "AM5", 5, 6, 65, True, False, ["DDR5"], 2024, 230),
    cpu("Ryzen 7 7700", "AMD", "AM5", 7, 8, 65, True, True, ["DDR5"], 2023, 250),
    cpu("Core i7-14700F", "Intel", "LGA1700", 7, 20, 65, False, True, ["DDR4", "DDR5"], 2024, 320),
    cpu("Ryzen 7 9700X", "AMD", "AM5", 7, 8, 65, True, False, ["DDR5"], 2024, 300),
    cpu("Core Ultra 7 265KF", "Intel", "LGA1851", 7, 20, 125, False, False, ["DDR5"], 2024, 305),
    cpu("Core i7-14700KF", "Intel", "LGA1700", 7, 20, 125, False, False, ["DDR4", "DDR5"], 2023, 340),
    cpu("Ryzen 7 7800X3D", "AMD", "AM5", 7, 8, 120, True, False, ["DDR5"], 2023, 365),
    cpu("Core Ultra 7 265K", "Intel", "LGA1851", 7, 20, 125, True, False, ["DDR5"], 2024, 330),
    cpu("Core i7-14700K", "Intel", "LGA1700", 7, 20, 125, True, False, ["DDR4", "DDR5"], 2023, 360),
    cpu("Ryzen 9 9900X", "AMD", "AM5", 9, 12, 120, True, False, ["DDR5"], 2024, 380),
    cpu("Ryzen 7 9800X3D", "AMD", "AM5", 7, 8, 120, True, False, ["DDR5"], 2024, 470),
    cpu("Core i9-14900K", "Intel", "LGA1700", 9, 24, 125, True, False, ["DDR4", "DDR5"], 2023, 480),
    cpu("Ryzen 9 9950X", "AMD", "AM5", 9, 16, 170, True, False, ["DDR5"], 2024, 560),
    cpu("Core i9-14900KS", "Intel", "LGA1700", 9, 24, 150, True, False, ["DDR4", "DDR5"], 2024, 620),
    # ---------------- дънни платки
    board("PRIME H610M-E D4", "ASUS", "LGA1700", "H610", "H", "DDR4", "mATX", 75),
    board("H610M S2H DDR4", "Gigabyte", "LGA1700", "H610", "H", "DDR4", "mATX", 78),
    board("PRO B760M-E DDR4", "MSI", "LGA1700", "B760", "B", "DDR4", "mATX", 95),
    board("B760M DS3H DDR4", "Gigabyte", "LGA1700", "B760", "B", "DDR4", "mATX", 105),
    board("PRO B760M-P DDR5", "MSI", "LGA1700", "B760", "B", "DDR5", "mATX", 115),
    board("TUF GAMING B760-PLUS WIFI", "ASUS", "LGA1700", "B760", "B", "DDR5", "ATX", 165),
    board("Z790 GAMING X AX", "Gigabyte", "LGA1700", "Z790", "Z", "DDR5", "ATX", 220),
    board("MAG Z790 TOMAHAWK WIFI", "MSI", "LGA1700", "Z790", "Z", "DDR5", "ATX", 260),
    board("Z790 AORUS ELITE AX", "Gigabyte", "LGA1700", "Z790", "Z", "DDR5", "ATX", 245),
    board("PRO B860M-A WIFI", "MSI", "LGA1851", "B860", "B", "DDR5", "mATX", 140),
    board("B860 EAGLE WIFI6E", "Gigabyte", "LGA1851", "B860", "B", "DDR5", "ATX", 155),
    board("TUF GAMING Z890-PLUS WIFI", "ASUS", "LGA1851", "Z890", "Z", "DDR5", "ATX", 290),
    board("PRO Z890-P WIFI", "MSI", "LGA1851", "Z890", "Z", "DDR5", "ATX", 255),
    board("A520M-A PRO", "MSI", "AM4", "A520", "A", "DDR4", "mATX", 58),
    board("B550M DS3H", "Gigabyte", "AM4", "B550", "B", "DDR4", "mATX", 85),
    board("A620M-E", "ASUS", "AM5", "A620", "A", "DDR5", "mATX", 85),
    board("B650M GAMING X AX", "Gigabyte", "AM5", "B650", "B", "DDR5", "mATX", 125),
    board("B650 TOMAHAWK WIFI", "MSI", "AM5", "B650", "B", "DDR5", "ATX", 175),
    board("X870 AORUS ELITE WIFI7", "Gigabyte", "AM5", "X870", "X", "DDR5", "ATX", 280),
    board("X870 GAMING PLUS WIFI", "MSI", "AM5", "X870", "X", "DDR5", "ATX", 240),
    board("ROG STRIX X870E-E", "ASUS", "AM5", "X870E", "X", "DDR5", "ATX", 420),
    # ---------------- памет
    ram("Fury Beast 16GB (2x8) DDR4-3200", "Kingston", "DDR4", "DIMM", 16, 3200, 38),
    ram("Vengeance LPX 16GB (2x8) DDR4-3200", "Corsair", "DDR4", "DIMM", 16, 3200, 42),
    ram("Ripjaws V 16GB (2x8) DDR4-3600", "G.Skill", "DDR4", "DIMM", 16, 3600, 45),
    ram("Fury Beast 32GB (2x16) DDR4-3600", "Kingston", "DDR4", "DIMM", 32, 3600, 75),
    ram("ValueRAM 16GB DDR4 SO-DIMM", "Kingston", "DDR4", "SO-DIMM", 16, 3200, 36),
    ram("Fury Beast 16GB (2x8) DDR5-5600", "Kingston", "DDR5", "DIMM", 16, 5600, 52),
    ram("Vengeance 16GB (2x8) DDR5-6000", "Corsair", "DDR5", "DIMM", 16, 6000, 58),
    ram("Flare X5 16GB (2x8) DDR5-6000", "G.Skill", "DDR5", "DIMM", 16, 6000, 60),
    ram("Fury Beast 32GB (2x16) DDR5-6000", "Kingston", "DDR5", "DIMM", 32, 6000, 105),
    ram("Vengeance 32GB (2x16) DDR5-6000", "Corsair", "DDR5", "DIMM", 32, 6000, 112),
    ram("Trident Z5 32GB (2x16) DDR5-6400", "G.Skill", "DDR5", "DIMM", 32, 6400, 128),
    ram("Dominator Titanium 32GB DDR5-6600", "Corsair", "DDR5", "DIMM", 32, 6600, 165),
    # ---------------- видеокарти
    gpu("RTX 3050 6GB", "MSI", 2, 6, 70, 190, 2022, False, 190),
    gpu("RTX 3060 12GB", "Gigabyte", 4, 12, 170, 240, 2021, False, 280),
    gpu("RX 7600 8GB", "Sapphire", 3, 8, 165, 240, 2023, False, 255),
    gpu("ARC B570 10GB", "Intel", 3, 10, 150, 272, 2025, True, 230),
    gpu("RTX 5050 8GB", "MSI", 4, 8, 130, 230, 2025, True, 255),
    gpu("RTX 5060 8GB", "ASUS", 5, 8, 145, 250, 2025, True, 300),
    gpu("RX 9060 XT 8GB", "Sapphire", 5, 8, 150, 260, 2025, True, 320),
    gpu("RX 9060 XT 16GB", "Gigabyte", 5, 16, 160, 280, 2025, True, 370),
    gpu("RTX 5060 Ti 16GB", "MSI", 6, 16, 180, 280, 2025, True, 440),
    gpu("RX 9070 GRE 12GB", "Sapphire", 6, 12, 220, 300, 2025, True, 520),
    gpu("RTX 5070 12GB", "Gigabyte", 7, 12, 250, 300, 2025, True, 580),
    gpu("RX 9070 16GB", "PowerColor", 7, 16, 220, 310, 2025, True, 630),
    gpu("RX 9070 XT 16GB", "Sapphire", 8, 16, 304, 320, 2025, True, 700),
    gpu("RTX 5070 Ti 16GB", "ASUS", 8, 16, 300, 325, 2025, True, 820),
    gpu("RTX 5070 Ti 16GB VENTUS", "MSI", 8, 16, 300, 305, 2025, True, 790),
    gpu("RTX 5080 16GB", "MSI", 9, 16, 360, 335, 2025, True, 1150),
    gpu("RTX 5080 16GB GAMING OC", "Gigabyte", 9, 16, 360, 340, 2025, True, 1190),
    gpu("RTX 5090 32GB", "ASUS", 10, 32, 575, 357, 2025, True, 2500),
    # ---------------- дискове
    disk("NV3 500GB NVMe", "Kingston", "NVMe", 500, 40),
    disk("P3 500GB NVMe", "Crucial", "NVMe", 500, 42),
    disk("MP600 Core XT 500GB", "Corsair", "NVMe", 500, 46),
    disk("A400 960GB SATA", "Kingston", "SATA", 960, 55),
    disk("NV3 1TB NVMe", "Kingston", "NVMe", 1000, 62),
    disk("P3 Plus 1TB NVMe", "Crucial", "NVMe", 1000, 66),
    disk("990 EVO 1TB NVMe", "Samsung", "NVMe", 1000, 78),
    disk("SN850X 1TB NVMe", "WD", "NVMe", 1000, 88),
    disk("NV3 2TB NVMe", "Kingston", "NVMe", 2000, 115),
    disk("990 PRO 2TB NVMe", "Samsung", "NVMe", 2000, 165),
    # ---------------- захранвания
    psu("CV450 450W 80+", "Corsair", 450, "80+", False, 38),
    psu("HYDRO K 500W 80+", "FSP", 500, "80+", False, 40),
    psu("MWE 550 V2 80+ Bronze", "Cooler Master", 550, "80+ Bronze", True, 48),
    psu("CX650 80+ Bronze", "Corsair", 650, "80+ Bronze", True, 58),
    psu("MAG A650BN 80+ Bronze", "MSI", 650, "80+ Bronze", True, 55),
    psu("Pure Power 12 650W 80+ Gold", "be quiet!", 650, "80+ Gold", True, 82),
    psu("RM750e 80+ Gold", "Corsair", 750, "80+ Gold", True, 98),
    psu("MAG A750GL 80+ Gold", "MSI", 750, "80+ Gold", True, 92),
    psu("Core Reactor II 750W 80+ Gold", "XPG", 750, "80+ Gold", True, 95),
    psu("RM850e 80+ Gold", "Corsair", 850, "80+ Gold", True, 120),
    psu("Focus GX-850 80+ Gold", "Seasonic", 850, "80+ Gold", True, 128),
    psu("RM1000x 80+ Gold", "Corsair", 1000, "80+ Gold", True, 175),
    psu("Dark Power 13 1000W 80+ Platinum", "be quiet!", 1000, "80+ Platinum", True, 230),
    # ---------------- охладители
    cooler("Hyper 212 Black", "Cooler Master", "air", 150, ALL_SOCKETS, 30, height=159),
    cooler("AK400", "DeepCool", "air", 180, ALL_SOCKETS, 28, height=155),
    cooler("Pure Rock 2", "be quiet!", "air", 150, ALL_SOCKETS, 35, height=155),
    cooler("Peerless Assassin 120", "Thermalright", "air", 245, ALL_SOCKETS, 38, height=155),
    cooler("AK620", "DeepCool", "air", 260, ALL_SOCKETS, 55, height=160),
    cooler("Liquid Freezer III 240", "Arctic", "aio", 250, ALL_SOCKETS, 85, radiator=240),
    cooler("MAG CoreLiquid A13 240", "MSI", "aio", 240, ALL_SOCKETS, 82, radiator=240),
    cooler("Liquid Freezer III 360", "Arctic", "aio", 300, ALL_SOCKETS, 110, radiator=360),
    cooler("Nautilus 360 RS", "Corsair", "aio", 300, ALL_SOCKETS, 125, radiator=360),
    cooler("ROG Ryuo III 360", "ASUS", "aio", 320, ALL_SOCKETS, 190, radiator=360),
    # ---------------- кутии (моделите и снимките — от машините на gsol.bg)
    box("FSP CMT160 ATX Mid Tower", "FSP", ["ATX", "mATX"], False, 330, 160, [240], IMG + "08/A3748CF2-9CDC-6135-3CC4-3C6A5E4871E9.jpeg", 32),
    box("HG XTREME SX-C3145A /TRANSP/BK", "HG Xtreme", ["ATX", "mATX"], True, 320, 155, [240], IMG + "08/25369.jpeg", 30),
    box("HG XTREME SX-C3153A/TRANSP+RGB", "HG Xtreme", ["ATX", "mATX"], True, 320, 155, [240], IMG + "08/30968.jpeg", 34),
    box("TrendSonic FC-F61A", "TrendSonic", ["ATX", "mATX"], False, 300, 150, [], IMG + "08/TRENDSONIC_FC-F61A_NEW.jpg", 28),
    box("XPG VALOR MESH BLACK", "XPG", ["ATX", "mATX"], True, 340, 160, [240, 360], IMG + "08/48286.png", 52),
    box("MSI MAG FORGE 121A", "MSI", ["ATX", "mATX"], True, 330, 160, [240], IMG + "08/46700.png", 55),
    box("Gigabyte C301 Black V2", "Gigabyte", ["ATX", "mATX"], True, 360, 165, [240, 360], IMG + "08/65CC1B5F-DF01-98FE-CC6C-C5E3BBAD029B.png", 62),
    box("FD POP MINI AIR RGB BLK TG CT", "Fractal Design", ["mATX"], True, 405, 170, [240], IMG + "08/32127.jpeg", 68),
    box("BITFENIX TRACERY ARGB WHITE", "BitFenix", ["ATX", "mATX"], True, 350, 165, [240, 360], IMG + "08/33023.png", 70),
    box("XPG STARKER AIR BTF BLACK", "XPG", ["ATX", "mATX"], True, 380, 170, [240, 360], IMG + "08/48593.png", 74),
    box("FD POP 2 AIR BLACK TG", "Fractal Design", ["ATX", "mATX"], True, 405, 170, [240, 360], IMG + "08/100217.jpg", 82),
    box("ZALMAN Z10 PLUS ATX MID BLACK", "Zalman", ["ATX", "mATX"], True, 390, 165, [240, 360], IMG + "10/104053.jpg", 85),
    box("Lian-Li SUP01W Mid-Tower", "Lian Li", ["ATX", "mATX"], True, 400, 170, [240, 360], IMG + "08/geli-952-a903a7207090f78749cb235bf48ffad1dc9a35d0.jpg", 110),
    box("Cooler Master HAF 500", "Cooler Master", ["ATX", "mATX"], True, 410, 167, [240, 360], IMG + "08/94494BDE-EAEA-F641-805F-0CA1100B03AC.png", 115),
    box("FD NORTH CHARC BLK TG DARK TH", "Fractal Design", ["ATX", "mATX"], True, 355, 170, [240, 360], IMG + "08/33117.jpeg", 135),
    box("FD TORRENT WHITE TG CLEAR", "Fractal Design", ["ATX", "mATX"], True, 461, 188, [240, 360], IMG + "08/28459.jpeg", 185),
    box("HYTE Y40 Tempered Glass", "HYTE", ["ATX", "mATX"], True, 422, 180, [240, 360], IMG + "08/CB365CA8-25D4-49D1-D435-34F14598C8E3.jpg", 150),
    box("FD NORTH XL CHARC BLACK TGD", "Fractal Design", ["ATX", "mATX"], True, 413, 185, [240, 360], IMG + "08/39446.jpeg", 175),
    box("FSP U691 Black ARGB TG", "FSP", ["ATX", "mATX"], True, 420, 175, [240, 360], IMG + "08/pic25400000000013362.jpg", 125),
    box("FD EPOCH XL WHITE TG RGB LIGHT", "Fractal Design", ["ATX", "mATX"], True, 410, 180, [240, 360], IMG + "08/100771.jpg", 120),
]


def rows():
    for i, p in enumerate(PARTS, start=1):
        kind, name, brand, specs, cost = p[:5]
        image = p[5] if len(p) > 5 else None
        yield dict(id=i, kind=kind, name=name, brand=brand, specs=specs, cost_cents=cost * 100, image=image,
                   lead_days=3 if kind != "case" else 4)


def sql_str(v):
    return "null" if v is None else "'" + str(v).replace("'", "''") + "'"


if __name__ == "__main__":
    if "--json" in sys.argv:
        print(json.dumps(list(rows()), ensure_ascii=False))
    else:
        values = ",\n".join(
            f"  ({sql_str(r['kind'])}, {sql_str(r['name'])}, {sql_str(r['brand'])}, {sql_str(json.dumps(r['specs']))}::jsonb, "
            f"{r['cost_cents']}, {r['lead_days']}, {sql_str(r['image'])}, true)"
            for r in rows()
        )
        print("insert into public.components (kind, name, brand, specs, cost_cents, lead_days, image_url, is_sample) values\n" + values + ";")
