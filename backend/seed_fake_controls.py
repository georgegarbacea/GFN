import json
import random
from datetime import datetime, timedelta

from sqlalchemy import text

from app.core.db import SessionLocal


FAKE_COUNT = 500


GARZI = [
    {
        "garda": "Garda Forestiera Brasov",
        "judete": ["Brasov", "Covasna", "Harghita"],
        "center": (45.65, 25.60),
    },
    {
        "garda": "Garda Forestiera Bucuresti",
        "judete": ["Ilfov", "Giurgiu", "Calarasi", "Ialomita"],
        "center": (44.55, 26.10),
    },
    {
        "garda": "Garda Forestiera Cluj",
        "judete": ["Cluj", "Bistrita-Nasaud", "Maramures", "Salaj"],
        "center": (46.77, 23.59),
    },
    {
        "garda": "Garda Forestiera Suceava",
        "judete": ["Suceava", "Botosani", "Neamt"],
        "center": (47.65, 26.25),
    },
    {
        "garda": "Garda Forestiera Timisoara",
        "judete": ["Timis", "Arad", "Caras-Severin"],
        "center": (45.75, 21.22),
    },
    {
        "garda": "Garda Forestiera Ramnicu Valcea",
        "judete": ["Valcea", "Gorj", "Dolj", "Olt"],
        "center": (45.10, 24.37),
    },
    {
        "garda": "Garda Forestiera Focsani",
        "judete": ["Vrancea", "Buzau", "Galati", "Braila"],
        "center": (45.70, 27.18),
    },
    {
        "garda": "Garda Forestiera Oradea",
        "judete": ["Bihor", "Satu Mare"],
        "center": (47.05, 21.93),
    },
    {
        "garda": "Garda Forestiera Ploiesti",
        "judete": ["Prahova", "Dambovita", "Arges"],
        "center": (44.94, 26.03),
    },
]


CONTROL_TYPES = [
    "fond",
    "tematic",
    "operativ",
    "sesizare",
]


MOD_DESFASURARE = {
    "fond": "control de fond",
    "tematic": "control tematic",
    "operativ": "control operativ",
    "sesizare": "control operativ",
}


RESULTS = [
    "conform",
    "conform",
    "conform",
    "conform",
    "conform",
    "neconform",
    "avertisment",
    "sanctiune",
    "sesizare_penala",
]


TIP_ENTITATE = [
    "ocol silvic",
    "operator economic",
    "primarie",
    "persoana fizica",
    "gestionar fond cinegetic",
]


INSPECTORI = [
    "Popescu Andrei",
    "Ionescu Mihai",
    "Dumitrescu Elena",
    "Stan Radu",
    "Georgescu Vlad",
    "Munteanu Ioana",
    "Marin Cristian",
    "Petrescu Alexandra",
    "Lupu Daniel",
    "Constantin Sorin",
    "Toma Gabriel",
    "Rusu Ana",
    "Moldovan Catalin",
    "Dobre Irina",
    "Nita Alexandru",
]


LOCALITATI = [
    "Brasov",
    "Moieciu",
    "Zarnesti",
    "Rasnov",
    "Predeal",
    "Mogosoaia",
    "Snagov",
    "Voluntari",
    "Buftea",
    "Cluj-Napoca",
    "Bistrita",
    "Baia Mare",
    "Suceava",
    "Vatra Dornei",
    "Campulung Moldovenesc",
    "Timisoara",
    "Resita",
    "Arad",
    "Ramnicu Valcea",
    "Targu Jiu",
    "Craiova",
    "Focsani",
    "Buzau",
    "Galati",
    "Oradea",
    "Beius",
    "Satu Mare",
    "Ploiesti",
    "Campina",
    "Curtea de Arges",
]


def random_date(days_back=180):
    d = datetime.now() - timedelta(days=random.randint(0, days_back))
    d = d.replace(
        hour=random.randint(7, 18),
        minute=random.choice([0, 5, 10, 15, 20, 30, 40, 45, 50]),
        second=0,
        microsecond=0,
    )
    return d


def random_point_near(center):
    lat, lon = center

    # puncte imprastiate realist in jurul centrului garzii
    lat = lat + random.uniform(-0.65, 0.65)
    lon = lon + random.uniform(-0.85, 0.85)

    return round(lat, 6), round(lon, 6)


def random_team():
    inspector_1 = random.choice(INSPECTORI)
    inspector_2 = random.choice([x for x in INSPECTORI if x != inspector_1])

    return [
        {
            "nume": inspector_1,
            "email": inspector_1.lower().replace(" ", ".").replace("a", "a").replace("t", "t").replace("s", "s").replace("i", "i").replace("a", "a") + "@gfn.gov.ro",
        },
        {
            "nume": inspector_2,
            "email": inspector_2.lower().replace(" ", ".").replace("a", "a").replace("t", "t").replace("s", "s").replace("i", "i").replace("a", "a") + "@gfn.gov.ro",
        },
    ]


def build_payload(index):
    g = random.choice(GARZI)
    control_type = random.choice(CONTROL_TYPES)
    result = random.choice(RESULTS)

    created_at = random_date()
    lat, lon = random_point_near(g["center"])

    judet = random.choice(g["judete"])
    localitate = random.choice(LOCALITATI)
    tip_entitate = random.choice(TIP_ENTITATE)

    entitati = {
        "ocol silvic": [
            "Ocolul Silvic Test Nord",
            "Ocolul Silvic Test Sud",
            "Ocolul Silvic Demo",
        ],
        "operator economic": [
            "SC Lemn Test SRL",
            "SC Forest Demo SRL",
            "SC Exploatare Simulare SRL",
        ],
        "primarie": [
            "Primaria Test",
            "Primaria Demo",
        ],
        "persoana fizica": [
            "Persoana fizica test",
        ],
        "gestionar fond cinegetic": [
            "Gestionar fond cinegetic test",
        ],
    }

    valoare_amenda = 0
    if result in ["sanctiune", "sesizare_penala", "neconform"]:
        valoare_amenda = random.choice([1000, 2500, 5000, 10000, 15000, 20000, 30000])

    payload = {
        "fake": True,
        "fake_batch": "seed_dashboard_gfn",

        "data_control": created_at.date().isoformat(),
        "ora_control": created_at.strftime("%H:%M"),

        "judet": judet,
        "garda": g["garda"],
        "localitate": localitate,
        "reper": f"Reper test {index} - parcela / drum forestier / depozit simulat",

        "lat": lat,
        "lon": lon,
        "gps": {
            "lat": lat,
            "lon": lon,
        },

        "echipa": random_team(),

        "entitate_controlata": random.choice(entitati[tip_entitate]),
        "tip_entitate": tip_entitate,
        "cui": str(random.randint(10000000, 99999999)),
        "sediu": f"{localitate}, judetul {judet}",
        "reprezentant_nume": random.choice(["Ion Test", "Maria Demo", "Vasile Exemplu", "Alexandru Simulare"]),
        "reprezentant_calitate": random.choice(["administrator", "sef ocol", "reprezentant legal", "imputernicit"]),

        "control_type": control_type,
        "mod_desfasurare": MOD_DESFASURARE[control_type],
        "result": result,

        "observatii": "Control fake generat automat pentru testarea dashboardului GFN.",
        "volum_verificat_mc": round(random.uniform(1, 850), 2),
        "valoare_amenda_lei": valoare_amenda,
        "sanctiune_aplicata": result in ["sanctiune", "sesizare_penala"],
        "sesizare_penala": result == "sesizare_penala",

        "domenii_verificate": random.sample(
            [
                "trasabilitate materiale lemnoase",
                "stoc depozit",
                "exploatare masa lemnoasa",
                "APV",
                "transport materiale lemnoase",
                "regim silvic",
                "fond cinegetic",
                "sesizare cetatean",
            ],
            k=random.randint(2, 5),
        ),
    }

    return payload, created_at, control_type, result


def get_existing_columns(db):
    rows = db.execute(
        text(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'controls'
            """
        )
    ).fetchall()

    return {row[0] for row in rows}


def get_user_id(db):
    # luam primul user existent ca autor al controalelor fake
    try:
        row = db.execute(text("SELECT id FROM users ORDER BY id LIMIT 1")).fetchone()
        if row:
            return row[0]
    except Exception:
        pass

    return None


def insert_control(db, columns, payload, created_at, control_type, result, user_id):
    insert_columns = []
    values_sql = []
    params = {}

    if "created_at" in columns:
        insert_columns.append("created_at")
        values_sql.append(":created_at")
        params["created_at"] = created_at

    if "updated_at" in columns:
        insert_columns.append("updated_at")
        values_sql.append(":updated_at")
        params["updated_at"] = created_at

    if "created_by_user_id" in columns and user_id is not None:
        insert_columns.append("created_by_user_id")
        values_sql.append(":created_by_user_id")
        params["created_by_user_id"] = user_id

    if "control_type" in columns:
        insert_columns.append("control_type")
        values_sql.append(":control_type")
        params["control_type"] = control_type

    if "result" in columns:
        insert_columns.append("result")
        values_sql.append(":result")
        params["result"] = result

    if "payload" in columns:
        insert_columns.append("payload")
        values_sql.append("CAST(:payload AS jsonb)")
        params["payload"] = json.dumps(payload, ensure_ascii=False)

    if not insert_columns:
        raise RuntimeError("Nu am gasit coloane compatibile in tabelul controls.")

    sql = f"""
        INSERT INTO controls ({", ".join(insert_columns)})
        VALUES ({", ".join(values_sql)})
        RETURNING id
    """

    row = db.execute(text(sql), params).fetchone()
    return row[0] if row else None


def main():
    db = SessionLocal()

    try:
        columns = get_existing_columns(db)
        print("Coloane gasite in controls:", sorted(columns))

        user_id = get_user_id(db)
        print("User folosit pentru created_by_user_id:", user_id)

        created = 0

        for i in range(1, FAKE_COUNT + 1):
            payload, created_at, control_type, result = build_payload(i)

            control_id = insert_control(
                db=db,
                columns=columns,
                payload=payload,
                created_at=created_at,
                control_type=control_type,
                result=result,
                user_id=user_id,
            )

            created += 1

            if created % 25 == 0:
                print(f"{created}/{FAKE_COUNT} controale fake create...")

        db.commit()

        print("")
        print(f"Gata. Au fost create {created} controale fake.")

    except Exception as e:
        db.rollback()
        print("EROARE la popularea controalelor fake:")
        print(e)
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()