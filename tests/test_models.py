from api.models import Game, Odds, PlayerProp, Score


def test_model_tablenames():
    assert Game.__tablename__ == "games"
    assert Odds.__tablename__ == "odds"
    assert PlayerProp.__tablename__ == "player_props"
    assert Score.__tablename__ == "scores"


def test_game_has_score_relationship():
    assert hasattr(Game, "score")


def test_score_has_game_relationship():
    assert hasattr(Score, "game")
