/**
 * `ReactPropsBinder` contient un tableau associatif (clé => valeur).
 * 
 * Chaque clé peut être associée à une valeur de `"props"` d'un composant React de manière à ce que lorsque la valeur associée change,
 * le composant React en est averti et effectue un nouveau rendu.
 *
 * Pour ce faire, il faut encapsuler le composant React avec la fonction `ReactPropsBinder.connect();`.
 * 
 * __Exemple :__
 * ```
 *  // Initialisation de la base de données
 *  ReactPropsBinder.init({
 *    "key.1": { },
 *    "key.2": 123
 *  });
 *
 *  // Association de clés de la base de données à des "props"
 *  var MyBindedComponent = ReactPropsBinder.connect(MyReactComponent, {
 *    dbObject: "key.1",
 *    count:    "key.2"
 *  });
 *
 *  // Maintenant, le composant <MyReactComponent /> a :
 *  this.props.dbObject == { };   // -> true
 *  this.props.count    == 123;   // -> true
 * ```
 * Une fois les `"props"` liées, le fait de changer la valeur en base (en utilisant `ReactPropsBinder.set()`)
 * affecte directement les `"props"` des composants liés, ce qui entraîne un rendu automatique.
 * 
 * __Avec l'exemple ci-dessus :__
 * ```
 *  ReactPropsBinder.set("key.2", 456);
 *
 *  // Maintenant, le composant <MyReactComponent /> a :
 *  this.props.dbObject == { };   // -> true
 *  this.props.count    == 456;   // -> true
 * ```
 */
var ReactPropsBinder =
{
  /** @var {object} _registry Registre associant les clés de base de données aux composants `{ dbKey => [ { cpn, props: [ { name, fct } ] }, ... ] }` */  _registry: { },
  /** @var {object} _data Données de la base */                                                                                                           _data:     { },

  /**
   * Initialisation des données de la base de données : clé => valeur.
   * @param {object} data les données initiales (clé => valeur)
   */
  init: function(data)
  {
    this._data = ((data == null) || (typeof(data) != "object")) ? {} : data;
  },

  /**
   * Enregistrement d'un composant pour être notifié de modifications de valeurs en base de données.
   * @param {React.Component} cpn le composant React à encapsuler
   * @param {object} links les clés liées aux attributs du composant (propriété du composant => clé de base de données)\
   * L'objet contentant l'association entre les clés de la base de données et les "props" du composant { propsName: "key" }
   * __Exemple :__ avec `links == { p1: "db.key.1" }`, le composant `cpn` aura `this.props.p1` qui sera défini par la valeur associée à la clé "*db.key.1*" de la base de données (valeur que l'on peut obtenir avec `get("db.key.1")`)\
   * Il est aussi possible de fournir un objet à la place du nom de la clé sous la forme : `{ key: "dbKey", fct: function(v) { return ... } }`\
   * Dans ce cas, au lieu de lier la valeur associée à la clé spécifiée, c'est la valeur retournée par la fonction fournie qui sera liée.\
   * La fonction fournie prend en paramètre la valeur associée à la clé spécifiée et retourne une interprétation de cette valeur pour l'affecter à la "props" liée.
   */
  register: function(cpn, links)
  {
    var inst = this;
    if ((cpn == null) || (cpn._dbReady !== true) || (links == null) || (typeof(links) !== "object")) { return; }
    var state = {}
    Object.keys(links).forEach(function(propName)
    {
      var link = links[propName];
      // Transformation en objet + clé en chaîne de caractères
      if ((link == null) || (typeof(link) != "object")) { link = { key: link }; }
      if ((typeof(link.key) != "string") || (link.key == "")) { return; }
      // Fonction valide ?
      if (typeof(link.fct) != "function") { link.fct = function(v) { return v; }; }

      // Affectation de la valeur initiale
      state[propName] = inst.get(link.key);
      
      if (!(link.key in inst._registry)) { inst._registry[link.key] = []; }
      var arr = inst._registry[link.key];
      var elt = null;
      for (var i = 0; i < arr.length; i++)
      {
        if (arr[i].cpn === cpn)
        {
          elt = arr[i];
          break;
        }
      }
      if (elt == null)
      {
        elt = { cpn: cpn, props: { } };
        inst._registry[link.key].push(elt);
      }
      if (!(propName in elt.props))
      {
        elt.props[propName] = link.fct;
      }
    });
    cpn.setState(state);
  },

  /** Effacement du registre des composants obsolètes abonnés aux changements de la base de données. */
  cleanRegistry: function()
  {
    var inst = this;
    for (var dbKey in inst._registry)
    {
      var lst = [];
      var arr = inst._registry[dbKey];
      inst._registry[dbKey] = lst;
      for (var i = 0; i < arr.length; i++)
      {
        var elt = arr[i];
        if ((elt.cpn._dbReady === true)) { lst.push(elt); }
      }
      inst._registry[dbKey] = lst;
    }
  },

  /**
   * Retourne la valeur associée à la clé fournie.
   * @param {string} key la clé de la base de données
   * @return {any} la valeur associée à la clé fournie (ou `null`)
   */
  get: function(key)
  {
    var inst = this;
    key = ""+key;
    return ((key in inst._data) ? inst._data[key] : null);
  },

  /**
   * Modification de la valeur associée à une clé.
   * @param {string} key la clé
   * @param {any} value la valeur
   */
  set: function(key, value)
  {
    var inst = this;
    // Détection d'un changement
    if ((!(key in inst._data)) || (inst._data[key] !== value))
    {
      inst._data[key] = value;
      // Notification sur les composants liés
      if (key in inst._registry)
      {
        var arr = inst._registry[key];
        var cleanNeeded = false;
        for (var i = 0; i < arr.length; i++)
        {
          var elt = arr[i];
          if (elt.cpn._dbReady !== true) { cleanNeeded = true; }
          else
          {
            var state = {};
            for (var propName in elt.props)
            {
              var fct = elt.props[propName];
              var finalValue = value;
              // Traitement sans échec !
              try      { finalValue = fct(value); }
              catch(e) { finalValue = value; }
              state[propName] = finalValue;
            }
            elt.cpn.setState(Object.assign({ }, elt.cpn.state, state));
          }
        }
        // Nettoyage nécessaire
        if (cleanNeeded == true)
        {
          inst.cleanRegistry();
        }
      }
    }
  },

  /**
   * Effectue l'encapsulation du composant fourni auquel seront associés les clés de données spécifiées.
   * @param {React.Component} WrappedComponent le composant React à encapsulter
   * @param {object} links la liste des clés de la base à associer.
   * __Exemple :__ avec `links = { myProperty: "database.key" }`,\
   * le composant `WrappedComponent` aura `this.props.myProperty == ReactPropsBinder.get("database.key")`\
   * Cf. `ReactPropsBinder.register()`
   * @return {React.Component} un nouveau composant React
   */
  connect: function(WrappedComponent, links)
  {
    var binder = this;
    /**
     * Classe React HOC - High Order Component : composant d'encapsulation.
     * @class MyHOC
     */
    class MyHOC extends React.Component
    {
      /** Liaison avec la base de données lorsque le composant est mis dans le DOM. */
      componentDidMount()
      {
        var inst = this;
        inst._dbReady = true;
        //connectToDatabase._newId = (connectToDatabase._newId == null) ? 1 : (connectToDatabase._newId + 1);
        //inst._uid = className + "@" + connectToDatabase._newId;
        //console.log("Links for component " + inst._uid + ":", links);
        binder.register(inst, links);
      }

      /** Libération de la lisaison avec la base de données lors que le composant est retiré du DOM. */
      componentWillUnmount()
      {
        var inst = this;
        inst._dbReady = false;
        binder.cleanRegistry();
      }
    
      /** Rendu qui encapsule le composant original en lui ajoutant les données liées en "props". */
      render()
      {
        // Les données liées sont gérées via le "state" du composant React MyHOC et transmise sous forme de "props" au composant encapsulé
        var customProps = Object.assign({ }, this.props, this.state);
        return React.createElement(WrappedComponent, customProps);
      }
    }
    return MyHOC;
  }
};
