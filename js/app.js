var UserCard = ReactPropsBinder.connect(class _UserCard extends React.Component
{
  render()
  {
    if ((Array.isArray(this.props.users) == false) || (this.props.idx >= this.props.users.length)) { return null; }
    var user = this.props.users[this.props.idx];
    if ((user == null) || (typeof(user) != "object")) { return null; }
    var status = user.online ? "online" : "offline";
    return <p>
      <span className={"status " + status} />
      <b>{user.name}</b> is <i>{status}</i>
    </p>;
  }
}, {
  users: "users"
});

var RootElement = ReactPropsBinder.connect(class _RootElement extends React.Component
{
  render()
  {
    var list = [];
    if (Array.isArray(this.props.users) == true)
    {
      for (var i = 0; i < this.props.users.length; i++)
      {
        list.push(<UserCard key={"userCard_" + this.props.users[i].id} idx={i} />);
      }
    }
    var status = this.props.online ? "online" : "offline";
    return <div>
      Connected as <b>{this.props.name}</b> (<span className={"status " + status} /><i>{status}</i>)
      <hr />
      {list}
    </div>;
  }
}, {
  users:  "users",
  name:   "me.name",
  online: "me.online"
});

setTimeout(function() {
  // Initialisation des données
  ReactPropsBinder.init({
    "me.name": "Thomas Foteau",
    "me.online": true,
    "users": [
      { id: 123, name: "Pierre", online: true  },
      { id: 456, name: "Paul",   online: false }
    ]
  });

  // Rendu de l'IHM React
  ReactDOM.render(<RootElement />, document.getElementById('root'));

  // Mise à jour d'une donnée en base : ajout d'une personne
  setTimeout(function() {
    // Copie du tableau pour que la valeur soit détectée comme différente (via "slice()") !
    var users = ReactPropsBinder.get("users").slice();
    users.push({ id: 789, name: "Jacques", online: true });
    ReactPropsBinder.set("users", users);
  }, 2000);
}, 2000);

function toggleMyStatus()
{
  ReactPropsBinder.set('me.online', !ReactPropsBinder.get('me.online'));
}