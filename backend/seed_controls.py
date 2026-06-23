from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.control import Control
from app.models.user import User

engine = create_engine(settings.DATABASE_URL, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

# userul IG existent
DEFAULT_EMAIL = "inspector.general@gfn.gov.ro"

demo_controls = [
    {
        "control_type": "tematic",
        "result": "conform",
        "payload": {
            "judet": "Brasov",
            "garda": "GF Brasov",
            "localitate": "Brasov",
            "entitate_controlata": "Ocolul Silvic Brasov",
            "tip_entitate": "ocol silvic",
            "inspectori": "Inspector A; Inspector B",
            "gps": {"lat": 45.657, "lon": 25.601},
            "constatari": "Control tematic fara nereguli.",
            "masuri_dispuse": "Nu au fost dispuse masuri."
        }
    },
    {
        "control_type": "operativ",
        "result": "neconform",
        "payload": {
            "judet": "Harghita",
            "garda": "GF Brasov",
            "localitate": "Miercurea Ciuc",
            "entitate_controlata": "Operator Forestier Harghita",
            "tip_entitate": "operator economic",
            "inspectori": "Inspector C; Inspector D",
            "gps": {"lat": 46.361, "lon": 25.804},
            "constatari": "Diferente intre stocul fizic si evidentele prezentate.",
            "masuri_dispuse": "S-a dispus reverificare si masuri de remediere."
        }
    },
    {
        "control_type": "sesizare",
        "result": "avertisment",
        "payload": {
            "judet": "Cluj",
            "garda": "GF Cluj",
            "localitate": "Cluj-Napoca",
            "entitate_controlata": "Depozit Lemn Cluj",
            "tip_entitate": "operator economic",
            "inspectori": "Inspector E",
            "gps": {"lat": 46.771, "lon": 23.623},
            "constatari": "Abateri minore privind evidenta materialului lemnos.",
            "masuri_dispuse": "Avertisment si termen de remediere."
        }
    },
    {
        "control_type": "tematic",
        "result": "sanctiune",
        "payload": {
            "judet": "Prahova",
            "garda": "GF Ploiesti",
            "localitate": "Ploiesti",
            "entitate_controlata": "Firma Exploatare PH",
            "tip_entitate": "operator economic",
            "inspectori": "Inspector F; Inspector G",
            "gps": {"lat": 44.946, "lon": 26.036},
            "constatari": "Nereguli constatate la documentele de provenienta.",
            "masuri_dispuse": "Aplicare sanctiune contraventionala."
        }
    },
    {
        "control_type": "operativ",
        "result": "sesizare_penala",
        "payload": {
            "judet": "Suceava",
            "garda": "GF Suceava",
            "localitate": "Suceava",
            "entitate_controlata": "Operator Forestier SV",
            "tip_entitate": "operator economic",
            "inspectori": "Inspector H; Inspector I",
            "gps": {"lat": 47.651, "lon": 26.255},
            "constatari": "Indiciile constatate impun sesizare penala.",
            "masuri_dispuse": "Sesizare transmisa organelor competente."
        }
    },
    {
        "control_type": "rutina",
        "result": "conform",
        "payload": {
            "judet": "Timis",
            "garda": "GF Timisoara",
            "localitate": "Timisoara",
            "entitate_controlata": "Ocol Timis",
            "tip_entitate": "ocol silvic",
            "inspectori": "Inspector J",
            "gps": {"lat": 45.748, "lon": 21.208},
            "constatari": "Control de rutina fara probleme.",
            "masuri_dispuse": "Nu au fost dispuse masuri."
        }
    },
    {
        "control_type": "sesizare",
        "result": "neconform",
        "payload": {
            "judet": "Valcea",
            "garda": "GF Ramnicu Valcea",
            "localitate": "Ramnicu Valcea",
            "entitate_controlata": "Depozit VL",
            "tip_entitate": "operator economic",
            "inspectori": "Inspector K; Inspector L",
            "gps": {"lat": 45.105, "lon": 24.375},
            "constatari": "Sesizare confirmata partial in urma verificarii.",
            "masuri_dispuse": "Masuri de conformare si reverificare."
        }
    },
    {
        "control_type": "tematic",
        "result": "avertisment",
        "payload": {
            "judet": "Bihor",
            "garda": "GF Oradea",
            "localitate": "Oradea",
            "entitate_controlata": "Operator BH",
            "tip_entitate": "operator economic",
            "inspectori": "Inspector M",
            "gps": {"lat": 47.073, "lon": 21.921},
            "constatari": "Documentatie incompleta la momentul controlului.",
            "masuri_dispuse": "Avertisment si termen de completare."
        }
    },
    {
        "control_type": "operativ",
        "result": "sanctiune",
        "payload": {
            "judet": "Galati",
            "garda": "GF Focsani",
            "localitate": "Galati",
            "entitate_controlata": "Depozit GL",
            "tip_entitate": "operator economic",
            "inspectori": "Inspector N; Inspector O",
            "gps": {"lat": 45.435, "lon": 28.008},
            "constatari": "Neconcordante semnificative identificate.",
            "masuri_dispuse": "Sanctiune aplicata."
        }
    },
    {
        "control_type": "rutina",
        "result": "conform",
        "payload": {
            "judet": "Bucuresti",
            "garda": "GF Bucuresti",
            "localitate": "Bucuresti",
            "entitate_controlata": "Depozit Bucuresti",
            "tip_entitate": "operator economic",
            "inspectori": "Inspector P",
            "gps": {"lat": 44.426, "lon": 26.102},
            "constatari": "Control de rutina fara deficiente.",
            "masuri_dispuse": "Nu au fost dispuse masuri."
        }
    }
]

def main():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == DEFAULT_EMAIL).first()
        if not user:
            print("Nu exista userul IG:", DEFAULT_EMAIL)
            return

        for item in demo_controls:
            c = Control(
                created_by_user_id=user.id,
                control_type=item["control_type"],
                result=item["result"],
                payload=item["payload"],
                created_at=datetime.utcnow()
            )
            db.add(c)

        db.commit()
        print("Au fost adaugate {} controale demo.".format(len(demo_controls)))
    finally:
        db.close()

if __name__ == "__main__":
    main()