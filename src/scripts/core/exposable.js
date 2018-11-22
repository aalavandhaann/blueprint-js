import {EventDispatcher, Mesh} from 'three';
import {EVENT_UPDATED} from './events.js';

class ExposableProperty
{
	constructor(instance, key, naam, eventname)
	{
		if(!instance instanceof EventDispatcher)
		{
			throw "Only instance of EventDispatchers can be added with an Exposable Property";
		}
		this._instance = instance;
		this._key = key;
		this._displayName = (naam) ? naam : 'None';
		this._eventToFire = eventname;
		this._propertyType = 'generic';
	}
	
	_updates()
	{
		if(this._eventToFire)
		{
			this._instance.dispatchEvent({type:this._eventToFire, item: this._instance});
		}		
	}
	
	set displayName(val)
	{
		this._displayName = val;
	}
	
	get displayName()
	{
		return this._displayName;
	}
	
	get key()
	{
		return this._key;
	}
	
	get propertyType()
	{
		return this._propertyType;
	}
}

class ExposableNumber extends ExposableProperty
{
	constructor(instance, key, pnaam, naam, eventname)
	{
		super(instance, key, pnaam, naam, eventname);
		this._propertyType = 'number';
		this._step = 1;
		this._max = 100;
		this._min = 0;
	}
	
	get step()
	{
		return this._step;
	}
	
	get max()
	{
		return this._max;
	}
	
	get min()
	{
		return this._min;
	}
}


class Exposable extends EventDispatcher
{
	constructor()
	{
		super();
		this._exposables = [];
	}
	
	_addExposable(key, propertytype, displayName, eventname)
	{
		var exposableproperty = null;
		if(propertytype == 'number')
		{
			exposableproperty = new ExposableNumber(this, key, displayName, eventname);
		}
		else
		{
			exposableproperty = new ExposableProperty(this, key, displayName, eventname);
		}
		this._exposables.push(exposableproperty);
	}
	
	get exposables()
	{
		return this._exposables;
	}
}

class ExposableMesh extends Mesh
{
	constructor()
	{
		super();
	}	
}

